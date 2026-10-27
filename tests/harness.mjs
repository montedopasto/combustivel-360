import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';
export function harness(){
 const state={sheets:{},properties:{SPREADSHEET_ID:'TEST-ONLY',PIN_PEPPER:'test-pepper',PAGES_ORIGIN:'https://test.invalid'},cache:new Map(),locked:false,mail:[],acquisitions:0,flushFail:false};
 class Sheet{constructor(name){this.name=name;this.data=[];}getLastRow(){return this.data.length;}appendRow(row){this.data.push(row);return this;}setFrozenRows(){return this;}getRange(row,col,n=1,width=1){return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:width},(_,j)=>this.data[row-1+i]?.[col-1+j]??'')),setValues:values=>{values.forEach((r,i)=>{this.data[row-1+i]??=[];r.forEach((v,j)=>this.data[row-1+i][col-1+j]=v);});return this;},setFontWeight(){return this;},setBackground(){return this;},setFontColor(){return this;}};}}
 const db={getSheetByName:n=>state.sheets[n],insertSheet:n=>(state.sheets[n]=new Sheet(n)),setSpreadsheetTimeZone:()=>{}};
 const property={getProperty:k=>state.properties[k]||null,setProperty:(k,v)=>{state.properties[k]=v;return property;},deleteProperty:k=>delete state.properties[k]};
 const cache={get:k=>state.cache.get(k)||null,put:(k,v)=>state.cache.set(k,v),remove:k=>state.cache.delete(k)};
 const ctx=vm.createContext({console,Date,Math,JSON,Number,String,Array,Object,Set,Map,Error,RegExp,encodeURIComponent,unescape,
 Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:(date,tz,format)=>{const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date);return format==='HH:mm:ss'?parts.slice(11):parts.slice(0,10);},base64Encode:b=>Buffer.from(b).toString('base64')},
 PropertiesService:{getScriptProperties:()=>property},CacheService:{getScriptCache:()=>cache},SpreadsheetApp:{openById:()=>db,flush:()=>{if(state.flushFail)throw new Error('Injected flush failure');}},LockService:{getScriptLock:()=>({tryLock:()=>{if(state.locked)return false;state.locked=true;state.acquisitions++;return true;},releaseLock:()=>state.locked=false})},MailApp:{sendEmail:m=>state.mail.push(m)},HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})}});
 for(const file of ['Core','Crypto','Store','Api','Reports','Automation'])vm.runInContext(fs.readFileSync(new URL('../backend/'+file+'.gs',import.meta.url),'utf8'),ctx);
 ctx.instalar_();
 const at='2026-01-01T12:00:00.000Z';
 function user(id,role,pin){const salt='test-salt';const u={id,name:id,role,active:true,at,pin:{salt,iterations:2,hash:ctx.pbkdf_(pin,salt,2),index:ctx.indexPin_(pin)}};ctx.put_('UTILIZADORES',u);const token=crypto.randomBytes(32).toString('hex');cache.put('session:'+ctx.hex_(ctx.sha_(ctx.bytes_(token))),JSON.stringify({id,version:u.pin.hash,expires:Date.now()+3600000}));return token;}
 const tokens={worker:user('colaborador','Colaborador','123456'),manager:user('responsavel','Responsável','234567'),admin:user('administrador','Administrador','345678')};
 for(const id of ['trolho','monte-ruivo'])ctx.put_('DEPOSITOS',{id,name:id,capacityMl:1000000,initialMl:500000,minimumMl:100000,initialCostMicro:1500000,active:true,at});
 ctx.put_('VEICULOS',{id:'tractor',plate:'AA-00-AA',description:'Test fixture only',active:true,at});
 const call=(token,action,data={})=>ctx.dispatch_({...data,action,token});
 const move=(token,data={},id=crypto.randomUUID())=>call(token,'movement',{operationId:id,kind:'SAIDA',tankId:'trolho',vehicleId:'tractor',litres:10,...data});
 return {ctx,state,tokens,call,move,crypto};
}
