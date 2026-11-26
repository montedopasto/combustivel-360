export function formatPlate(value) {
 const text=String(value).toUpperCase();
 const compact=text.replace(/[\s-]/g,'');
 return /^[A-Z0-9]{6}$/.test(compact)?compact.match(/.{2}/g).join('-'):text;
}

export function attachPlateFormat(input, enabled=()=>true) {
 const format=()=>{
  if(!enabled())return;
  const value=formatPlate(input.value);
  if(value!==input.value)input.value=value;
 };
 input.addEventListener('input',format);
 input.addEventListener('change',format);
}
