const runtime = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
const model = 'https://huggingface.co/PaddlePaddle/latin_PP-OCRv5_mobile_rec_onnx/resolve/89d3a50/inference.onnx';
let engine;

async function loadEngine() {
  engine ??= (async () => {
    const [ort, response] = await Promise.all([
      import(runtime + 'ort.wasm.min.mjs'),
      fetch(new URL('./guia-ocr-chars.json', import.meta.url))
    ]);
    if (!response.ok) throw new Error('Dicionário do leitor indisponível.');
    ort.env.wasm.wasmPaths = runtime;
    ort.env.wasm.numThreads = 1;
    const [session, characters] = await Promise.all([
      ort.InferenceSession.create(model, {executionProviders: ['wasm']}),
      response.json()
    ]);
    return {ort, session, characters};
  })().catch(error => { engine = undefined; throw error; });
  return engine;
}

function inputPixels(crop, {angle, ratio, contrast}) {
  const frame = document.createElement('canvas');
  const radians = angle * Math.PI / 180;
  const width = crop.width * ratio;
  const height = crop.height;
  const padding = 24;
  frame.width = Math.ceil(Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))) + padding;
  frame.height = Math.ceil(Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))) + padding;
  const context = frame.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, frame.width, frame.height);
  context.translate(frame.width / 2, frame.height / 2);
  context.rotate(radians);
  context.drawImage(crop, -width / 2, -height / 2, width, height);
  const resized = document.createElement('canvas');
  resized.width = Math.min(320, Math.ceil(frame.width * 48 / frame.height));
  resized.height = 48;
  const resize = resized.getContext('2d', {willReadFrequently: true});
  resize.imageSmoothingQuality = 'high';
  resize.drawImage(frame, 0, 0, resized.width, 48);
  const {data} = resize.getImageData(0, 0, resized.width, 48);
  const stride = 48 * 320;
  const input = new Float32Array(3 * stride);
  let pivot = 0;
  for (let i = 0; i < data.length; i += 4) pivot += .299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2];
  pivot /= data.length / 4;
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < resized.width; x++) {
      const offset = (y * resized.width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const value = Math.min(255, Math.max(0, pivot + (data[offset + 2 - channel] - pivot) * contrast));
        input[channel * stride + y * 320 + x] = value / 127.5 - 1;
      }
    }
  }
  frame.width = resized.width = 0;
  return input;
}

function decode(output, characters) {
  const size = output.dims.at(-1);
  if (size !== characters.length) throw new Error('Dicionário do leitor incompatível.');
  let text = '', previous = 0;
  for (let offset = 0; offset < output.data.length; offset += size) {
    let best = 0;
    for (let i = 1; i < size; i++) {
      if (output.data[offset + i] > output.data[offset + best]) best = i;
    }
    if (best && best !== previous) text += characters[best];
    previous = best;
  }
  return text;
}

export async function readGuideLine(crop, kind, signal) {
  const {ort, session, characters} = await loadEngine();
  const variants = kind === 'plate'
    ? [{angle:0, ratio:1.25, contrast:1}, {angle:0, ratio:1, contrast:1}]
    : [{angle:-10, ratio:1, contrast:2}, {angle:-4, ratio:.7, contrast:2},
       {angle:0, ratio:1, contrast:1}, {angle:8, ratio:1.2, contrast:2},
       {angle:4, ratio:1, contrast:1}, {angle:-4, ratio:1, contrast:1}];
  const texts = [];
  for (const variant of variants) {
    await new Promise(resolve => setTimeout(resolve, 0));
    signal?.throwIfAborted();
    const pixels = inputPixels(crop, variant);
    const tensor = new ort.Tensor('float32', pixels, [1, 3, 48, 320]);
    const results = await session.run({[session.inputNames[0]]:tensor});
    texts.push(decode(results[session.outputNames[0]], characters));
  }
  return texts;
}
