// Photos remain in this page's memory. Only confirmed text/numbers reach the API.
export const plateKey = value => String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
export function plateCandidates(text, vehicles) {
  const lines=String(text).toUpperCase().split(/\r?\n/).map(plateKey);
  const known=vehicles.filter(v=>{const key=plateKey(v.plate);return key.length>=4&&lines.some(line=>line.includes(key));});if(known.length)return known;
  return [...new Set(lines.filter(line=>/^[A-Z0-9]{4,12}$/.test(line)&&/[A-Z]/.test(line)&&/[0-9]/.test(line)))].map(plate=>({plate}));
}
export function litreCandidates(text) {
  const found=new Set();
  for(const token of String(text).match(/-?\d+(?:[., ]\d+)*/g)||[]) {
    let clean=token.trim();
    if(/^\d{1,3}(?:[. ]\d{3})+,\d{1,2}$/.test(clean))clean=clean.replace(/[. ]/g,'').replace(',','.');
    else if(/^\d+(?:[.,]\d{1,2})?$/.test(clean))clean=clean.replace(',','.');
    else continue; // Ambiguous separators or several displays: never guess.
    const n=Number(clean);if(n>0&&n<=10000000)found.add(n);
  }
  return [...found];
}
let engine;
function loadEngine(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(!engine)engine=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.crossOrigin='anonymous';const timer=setTimeout(()=>{script.remove();reject(new Error('Não foi possível carregar a leitura de fotografias. Preencha manualmente.'));},45000);script.onload=()=>{clearTimeout(timer);resolve(window.Tesseract);};script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Leitura de fotografias indisponível. Preencha manualmente.'));};document.head.append(script);}).catch(error=>{engine=null;throw error;});
  return engine;
}
export async function readCanvas(canvas,kind,onProgress=()=>{},signal){
  let worker,timer;
  let finished=false;
  const cancel=()=>{if(worker)void worker.terminate().catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    const T=await loadEngine();if(signal?.aborted)throw new Error('Leitura cancelada.');
    const create=T.createWorker('eng',1,{cacheMethod:'none',logger:m=>{if(!signal?.aborted)onProgress(m.status==='recognizing text'?'A ler… '+Math.round((m.progress||0)*100)+'%':'A preparar a leitura…');}}).then(w=>{if(finished){void w.terminate().catch(()=>{});throw new Error('Leitura cancelada.');}return w;});
    worker=await Promise.race([create,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Não foi possível preparar a leitura. Tente outra vez ou preencha manualmente.')),60000);}),new Promise((_,reject)=>{if(signal?.aborted)reject(new Error('Leitura cancelada.'));else signal?.addEventListener('abort',()=>reject(new Error('Leitura cancelada.')),{once:true});})]);
    clearTimeout(timer);
    if(signal?.aborted)throw new Error('Leitura cancelada.');
    await worker.setParameters({tessedit_pageseg_mode:kind==='plate'?'7':'6'});
    return await Promise.race([worker.recognize(canvas,{}, {text:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('A leitura demorou demasiado. Tente outra foto ou preencha manualmente.')),60000);}),new Promise((_,reject)=>{if(signal?.aborted)reject(new Error('Leitura cancelada.'));else signal?.addEventListener('abort',()=>reject(new Error('Leitura cancelada.')),{once:true});})]);
  }finally{finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);if(worker)await worker.terminate().catch(()=>{});}
}
export function attachPhotos(form,vehicles){
  let busy=false,used=false,closed=false,controller;
  const confirm=form.querySelector('[data-photo-confirm]'),review=form.querySelector('[data-photo-review]');
  const reset=()=>{if(used)confirm.checked=false;};
  form.querySelector('[name="plate"]').addEventListener('input',reset);form.querySelector('[name="litres"]').addEventListener('input',reset);form.querySelector('[name="tankId"]').addEventListener('change',reset);form.querySelector('[name="vehicleIdentification"]')?.addEventListener('input',reset);form.querySelector('#noPlate')?.addEventListener('change',reset);
  form.addEventListener('submit',event=>{if(busy){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
  const observer=new MutationObserver(()=>{if(!form.isConnected){closed=true;controller?.abort();document.querySelector('[data-photo-dialog]')?.close();observer.disconnect();}});observer.observe(form.parentNode.parentNode,{childList:true,subtree:true});
  for(const input of form.querySelectorAll('[data-photo-kind]'))input.addEventListener('change',async()=>{
    let file=input.files?.[0];input.value='';if(!file||busy)return;
    if(!navigator.onLine){form.querySelector('[data-photo-status]').textContent='Sem ligação. Volte a tentar quando tiver Internet.';return;}
    const kind=input.dataset.photoKind;used=true;review.hidden=false;confirm.required=true;confirm.checked=false;
    const status=form.querySelector('[data-photo-status]');
    if(!file.type.startsWith('image/')||file.size>25*1024*1024){status.textContent='Escolha uma imagem até 25 MB. Pode preencher os valores manualmente.';return;}
    busy=true;form.querySelector('button[type="submit"]').disabled=true;
    const dialog=document.createElement('dialog');dialog.dataset.photoDialog='';dialog.className='photo-dialog';dialog.innerHTML='<h2>'+ (kind==='plate'?'Ler matrícula':'Ler litros do abastecimento')+'</h2><p>Enquadre apenas '+(kind==='plate'?'a matrícula':'os números dos litros, incluindo a vírgula')+'. Arraste sobre a imagem para selecionar essa zona.</p><canvas aria-label="Fotografia: arraste para selecionar a zona de leitura"></canvas><p data-progress role="status"></p><div class="row"><button type="button" data-read>LER ZONA SELECIONADA</button><button type="button" data-all>Imagem inteira</button><button type="button" data-cancel>Cancelar</button></div>';
    const canvas=dialog.querySelector('canvas'),source=document.createElement('canvas'),ctx=canvas.getContext('2d');let region,start,working=false,bitmap;
    controller=new AbortController();const progress=message=>{dialog.querySelector('[data-progress]').textContent=message;};
    const draw=()=>{ctx.drawImage(source,0,0);if(region){ctx.strokeStyle='#b7e574';ctx.lineWidth=4;ctx.strokeRect(region.x,region.y,region.w,region.h);}};
    const point=event=>{const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(canvas.width,(event.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height,(event.clientY-r.top)*canvas.height/r.height))};};
    canvas.addEventListener('pointerdown',event=>{if(working)return;start=point(event);canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',event=>{if(!start||working)return;const p=point(event);region={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(start.x-p.x),h:Math.abs(start.y-p.y)};draw();});
    canvas.addEventListener('pointerup',()=>{start=null;if(region&&(region.w<12||region.h<12))region=null;draw();});
    dialog.querySelector('[data-all]').onclick=()=>{region=null;draw();};dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    const finish=()=>{controller?.abort();source.width=source.height=canvas.width=canvas.height=0;bitmap?.close();dialog.remove();busy=false;if(form.isConnected)form.querySelector('button[type="submit"]').disabled=!navigator.onLine;};
    dialog.addEventListener('close',finish,{once:true});
    dialog.querySelector('[data-read]').onclick=async()=>{
      if(working)return;working=true;dialog.querySelector('[data-read]').disabled=true;dialog.querySelector('[data-all]').disabled=true;
      const crop=document.createElement('canvas'),r=region||{x:0,y:0,w:source.width,h:source.height};const scale=Math.min(3,Math.max(1,1200/r.w));crop.width=Math.round(r.w*scale);crop.height=Math.round(r.h*scale);crop.getContext('2d').drawImage(source,r.x,r.y,r.w,r.h,0,0,crop.width,crop.height);
      try{
        const result=await readCanvas(crop,kind,progress,controller.signal);if(closed||!dialog.open)return;
        const candidates=kind==='plate'?plateCandidates(result.data.text,vehicles):litreCandidates(result.data.text);
        if(candidates.length!==1||(!Number.isFinite(result.data.confidence)||result.data.confidence<55)){progress(candidates.length>1?'Foram encontrados vários valores. Selecione apenas a zona correta e tente novamente, ou cancele e preencha manualmente.':'Não foi possível ler com segurança. Enquadre melhor ou preencha manualmente.');return;}
        const target=form.querySelector(kind==='plate'?'[name="plate"]':'[name="litres"]');target.value=kind==='plate'?candidates[0].plate:candidates[0];target.dispatchEvent(new Event('input',{bubbles:true}));status.textContent=(kind==='plate'?'Matrícula preenchida.':'Litros preenchidos.')+' Verifique o valor antes de confirmar.';dialog.close();
      }catch(error){if(dialog.open)progress(error.message||'Não foi possível ler. Preencha manualmente.');}
      finally{crop.width=crop.height=0;working=false;if(dialog.isConnected){dialog.querySelector('[data-read]').disabled=false;dialog.querySelector('[data-all]').disabled=false;}}
    };
    try{bitmap=await createImageBitmap(file);file=null;if(closed){finish();return;}const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));canvas.width=source.width=Math.round(bitmap.width*scale);canvas.height=source.height=Math.round(bitmap.height*scale);source.getContext('2d').drawImage(bitmap,0,0,source.width,source.height);bitmap.close();bitmap=null;draw();document.body.append(dialog);dialog.showModal();status.textContent='';}
    catch{file=null;finish();status.textContent='Não foi possível abrir a imagem. Use JPEG/PNG ou preencha manualmente.';}
  });
}
export const photoFields=()=>'<div class="photo-actions"><label class="photo-button">Fotografar matrícula<input type="file" accept="image/*" capture="environment" data-photo-kind="plate"></label><label class="photo-button">Fotografar contador<input type="file" accept="image/*" capture="environment" data-photo-kind="litres"></label></div><p class="hint">Fotografias opcionais, lidas neste dispositivo e descartadas. Fotografe só a matrícula ou os litros deste abastecimento. Também pode preencher manualmente.</p><p data-photo-status role="status" class="hint"></p>';
export const photoReview=()=>'<label data-photo-review hidden class="photo-review"><input type="checkbox" data-photo-confirm> Confirmei o depósito, a identificação do veículo e os litros do abastecimento.</label>';
