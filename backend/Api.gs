function doGet(){return HtmlService.createHtmlOutput('<h1>COMBUSTÍVEL 360</h1><p>Serviço de operações da Monte do Pasto. Abra a aplicação no endereço GitHub Pages configurado pelo administrador.</p>');}
function doPost(e){
 let nonce='', result; const origin=props_().getProperty('PAGES_ORIGIN');
 try {assert_(origin&&/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(origin),'Origem não configurada.');assert_(e.parameter.payload&&e.parameter.payload.length<30000,'Pedido inválido.');const p=JSON.parse(e.parameter.payload);nonce=p.nonce;assert_(/^[a-f0-9]{32,64}$/.test(nonce),'Pedido inválido.');result={ok:true,data:dispatch_(p)};}
 catch(err){result={ok:false,definitive:err.definitive===true,error:err.definitive?err.message:'Não foi possível confirmar a operação. Reenvie os mesmos dados.'};}
 const data=JSON.stringify({channel:'combustivel360',nonce,result}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const html='<script>window.top.postMessage('+data+','+JSON.stringify(origin||'https://invalid.invalid')+');</script>';
 return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function rate_(key,max,seconds){const store=props_();const now=Date.now();let buckets=JSON.parse(store.getProperty('RATE_LIMITS')||'{}');Object.keys(buckets).forEach(k=>{if(buckets[k].until<=now)delete buckets[k];});const item=buckets[key]||{count:0,until:now+seconds*1000};assert_(item.count<max,'Demasiadas tentativas. Aguarde alguns minutos.');assert_(Object.keys(buckets).length<120||buckets[key],'Demasiadas tentativas. Aguarde alguns minutos.');item.count++;buckets[key]=item;store.setProperty('RATE_LIMITS',JSON.stringify(buckets));}
function login_(p){return lock_(()=>{rate_('global',100,600);rate_(hex_(sha_(bytes_(String(p.pin||'')))).slice(0,20),5,600);const pin=text_(p.pin,6);assert_(/^\d{4,6}$/.test(pin),'O PIN deve ter entre 4 e 6 números.');const u=rows_('UTILIZADORES').find(x=>x.active&&equal_(x.pin.index,indexPin_(pin)));assert_(u&&checkPin_(pin,u),'PIN inválido ou utilizador inativo.');const token=random_();CacheService.getScriptCache().put('session:'+hex_(sha_(bytes_(token))),JSON.stringify({id:u.id,version:u.pin.hash,expires:Date.now()+3600000}),3600);return {token,user:{id:u.id,name:u.name,role:u.role},expires:Date.now()+3600000};});}
function session_(token){assert_(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token),'Sessão inválida. Entre novamente.');const s=CacheService.getScriptCache().get('session:'+hex_(sha_(bytes_(token))));assert_(s,'Sessão expirada. Entre novamente.');const auth=JSON.parse(s);const u=rows_('UTILIZADORES').find(x=>x.id===auth.id&&x.active);assert_(u&&equal_(auth.version,u.pin.hash)&&auth.expires>Date.now(),'Sessão expirada ou utilizador desativado.');return u;}
function manage_(u){assert_(['Administrador','Responsável'].includes(u.role),'Acesso não autorizado.');}
function admin_(u){assert_(u.role==='Administrador','Acesso não autorizado.');rate_('admin:'+u.id,10,600);}
function publicUser_(u){return {id:u.id,name:u.name,role:u.role,active:u.active,at:u.at};}
function dispatch_(p){
 assert_(p&&typeof p==='object','Pedido inválido.');
 if(p.action==='login')return login_(p);
 if(p.action==='bootstrap')return bootstrap_(p);
 const u=session_(p.token);
 if(p.action==='logout'){CacheService.getScriptCache().remove('session:'+hex_(sha_(bytes_(p.token))));return true;}
 if(p.action==='catalog')return {tanks:rows_('DEPOSITOS').filter(t=>t.active).map(t=>({id:t.id,name:t.name})),vehicles:rows_('VEICULOS').filter(v=>v.active).map(v=>({id:v.id,plate:v.plate,description:v.description}))};
 if(p.action==='movement')return movement_(u,p);
 manage_(u);
 if(p.action==='overview')return overview_(p.filters);
 if(p.action==='report')return report_(p.filters);
 if(p.action==='export')return export_(p.filters,p.format);
 if(p.action==='adminData'){assert_(u.role==='Administrador','Acesso não autorizado.');return {tanks:tanks_(),vehicles:rows_('VEICULOS'),users:rows_('UTILIZADORES').map(publicUser_),config:config_()};}
 if(p.action==='save')return save_(u,p);
 fail_('Operação desconhecida.');
}
function bootstrap_(p){return lock_(()=>{
 rate_('bootstrap',5,600);assert_(!rows_('UTILIZADORES').length,'Inicialização já concluída.');assert_(p.bootstrapToken&&equal_(p.bootstrapToken,props_().getProperty('BOOTSTRAP_TOKEN')),'Código de inicialização inválido.');
 const name=text_(p.name,120);assert_(name,'Nome obrigatório.');const pin=protectPin_(String(p.pin));const tanks=p.tanks;assert_(Array.isArray(tanks)&&tanks.length===2,'Configure os dois depósitos.');
 const prepared=tanks.map((t,i)=>tankInput_(Object.assign({},t,{id:['trolho','monte-ruivo'][i],name:['Herdade do Trolho','Herdade de Monte Ruivo'][i],active:true}),null));
 prepared.forEach(t=>put_('DEPOSITOS',t));put_('UTILIZADORES',{id:random_(),name,role:'Administrador',pin,active:true,at:new Date().toISOString()});props_().deleteProperty('BOOTSTRAP_TOKEN');return {message:'Inicialização concluída. Entre com o seu PIN.'};
 });}
function tankInput_(p,old){
 const capacityMl=amount_(p.capacity),minimumMl=amount_(p.minimum,true),initialMl=old?old.initialMl:amount_(p.initial,true);assert_(minimumMl<=capacityMl&&initialMl<=capacityMl,'Stock e mínimo devem caber no depósito.');if(old)assert_(old.stockMl<=capacityMl,'Capacidade inferior ao stock existente.');
 let initialCostMicro=old?old.initialCostMicro:null;if(!old&&p.initialCost!==''&&p.initialCost!=null){assert_(Number.isFinite(p.initialCost)&&p.initialCost>=0&&p.initialCost<100,'Preço inicial inválido.');initialCostMicro=Math.round(p.initialCost*1e6);}
 return {id:p.id,name:text_(p.name,120),capacityMl,minimumMl,initialMl,initialCostMicro,active:p.active!==false,at:old?old.at:new Date().toISOString()};
}
function save_(u,p){return lock_(()=>{u=session_(p.token);admin_(u,p);const d=p.data||{};
 if(p.entity==='vehicle'){const vs=rows_('VEICULOS');const old=vs.find(v=>v.id===d.id);const plate=plate_(d.plate);assert_(plate&&/^[A-Z0-9-]+$/.test(plate),'Matrícula inválida.');assert_(!vs.some(v=>v.id!==d.id&&plate_(v.plate)===plate),'Matrícula já existente.');const o={id:old?old.id:random_(),plate,description:text_(d.description,200),active:d.active!==false,at:old?old.at:new Date().toISOString()};put_('VEICULOS',o);return o;}
 if(p.entity==='user'){const us=rows_('UTILIZADORES');const old=us.find(x=>x.id===d.id);assert_(['Administrador','Responsável','Colaborador'].includes(d.role),'Perfil inválido.');assert_(text_(d.name,120),'Nome obrigatório.');if(old&&old.role==='Administrador'&&(d.role!=='Administrador'||d.active===false))assert_(us.some(x=>x.id!==old.id&&x.active&&x.role==='Administrador'),'Mantenha um administrador ativo.');let pin=old?old.pin:null;if(d.pin){assert_(!us.some(x=>x.id!==d.id&&equal_(x.pin.index,indexPin_(String(d.pin)))),'PIN já atribuído.');pin=protectPin_(String(d.pin));}assert_(pin,'PIN obrigatório.');const o={id:old?old.id:random_(),name:d.name,role:d.role,active:d.active!==false,pin,at:old?old.at:new Date().toISOString()};put_('UTILIZADORES',o);return publicUser_(o);}
 if(p.entity==='tank'){const old=tanks_().find(t=>t.id===d.id);assert_(old,'Depósito inexistente.');const o=tankInput_(d,old);assert_(o.name,'Nome obrigatório.');put_('DEPOSITOS',o);reconcile_();return true;}
 if(p.entity==='config'){assert_(Number.isFinite(d.safetyDays)&&d.safetyDays>=0&&d.safetyDays<=30,'Margem entre 0 e 30 dias.');assert_(Array.isArray(d.emails)&&d.emails.length<=10&&d.emails.every(x=>/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(x)),'Destinatários inválidos.');put_('CONFIGURACOES',{id:'geral',safetyDays:d.safetyDays,emails:d.emails,alerts:d.alerts!==false,leadDays:5});return true;}
 fail_('Configuração inválida.');});}
function movement_(u,p){return lock_(()=>{
 /* Re-read the session after acquiring the lock, including deactivation/role changes. */
 u=session_(p.token);assert_(/^[a-f0-9-]{32,64}$/.test(p.operationId||''),'Identificador de operação inválido.');
 const fingerprint=hex_(sha_(bytes_(JSON.stringify({kind:p.kind,tankId:p.tankId,vehicleId:p.vehicleId,litres:p.litres,price:p.price,supplier:p.supplier,deliveryDate:p.deliveryDate,measured:p.measured,expectedStock:p.expectedStock,reason:p.reason,root:p.root}))));
 const ledger=rows_('MOVIMENTOS');const previous=ledger.find(m=>m.id===p.operationId);if(previous){assert_(previous.userId===u.id&&previous.fingerprint===fingerprint,'Identificador já utilizado para outra operação.');try{projectMovement_(previous);balances_(rows_('DEPOSITOS'),ledger).forEach(t=>put_('DEPOSITOS',t));}catch(err){console.error('Projeções pendentes.');}return {id:previous.id,message:'Operação já registada com sucesso.'};}
 const kind=p.kind;assert_(['SAIDA','ENTRADA','ACERTO','CORRECAO','ANULACAO'].includes(kind),'Tipo inválido.');if(kind!=='SAIDA')manage_(u);if(['CORRECAO','ANULACAO'].includes(kind))admin_(u,p);
 const t=balances_(rows_('DEPOSITOS'),ledger).find(t=>t.id===p.tankId);assert_(t&&t.active,'Depósito indisponível.');
 const m={id:p.operationId,fingerprint,kind,tankId:t.id,tankName:t.name,at:new Date().toISOString(),userId:u.id,userName:u.name,before:t.stockMl};
 if(kind==='SAIDA'){const v=rows_('VEICULOS').find(x=>x.id===p.vehicleId&&x.active);assert_(v,'Matrícula inexistente ou desativada.');m.vehicleId=v.id;m.plate=v.plate;m.delta=-amount_(p.litres);}
 if(kind==='ENTRADA'){m.delta=amount_(p.litres);assert_(Number.isFinite(p.price)&&p.price>0&&p.price<100,'Preço por litro inválido.');m.priceMicro=Math.round(p.price*1e6);m.supplier=text_(p.supplier,120);assert_(m.supplier,'Fornecedor obrigatório.');m.deliveryDate=dateInput_(p.deliveryDate);assert_(m.deliveryDate<=dateKey_(m.at),'A entrega não pode ser futura.');}
 if(kind==='ACERTO'){m.measuredMl=amount_(p.measured,true);assert_(amount_(p.expectedStock,true)===t.stockMl,'O stock mudou. Atualize a consulta antes do acerto.');m.delta=m.measuredMl-t.stockMl;m.reason=text_(p.reason,500);assert_(m.reason,'Justificação obrigatória.');}
 if(kind==='CORRECAO'||kind==='ANULACAO'){
 const original=ledger.find(x=>x.id===p.root&&!['CORRECAO','ANULACAO'].includes(x.kind));assert_(original&&original.tankId===t.id,'Movimento original inválido.');const current=effective_(ledger).find(x=>x.id===p.root);assert_(current,'Movimento já anulado.');m.root=p.root;m.previous=current;m.reason=text_(p.reason,500);assert_(m.reason,'Justificação obrigatória.');
 if(kind==='ANULACAO'){m.delta=-current.delta;m.next=null;}else{assert_(current.kind!=='ACERTO','Anule o acerto e registe uma nova medição.');const delta=amount_(p.litres)*(current.kind==='SAIDA'?-1:1);m.next=Object.assign({},current,{delta});if(current.kind==='ENTRADA'){assert_(Number.isFinite(p.price)&&p.price>0&&p.price<100,'Preço obrigatório.');m.next.priceMicro=Math.round(p.price*1e6);}m.delta=delta-current.delta;}
 }
 m.after=m.before+m.delta;assert_(m.after>=0,'Stock insuficiente para esta operação.');assert_(m.after<=t.capacityMl,'A quantidade ultrapassa a capacidade do depósito.');
 /* Validate corrected chronological costs and quantities as well as today's balance. */
 const simulated=ledger.concat(m);const running={};rows_('DEPOSITOS').forEach(x=>running[x.id]=x.initialMl);effective_(simulated).forEach(x=>{running[x.tankId]+=x.delta;assert_(running[x.tankId]>=0,'A correção criaria stock histórico negativo.');});
 append_('MOVIMENTOS',m);SpreadsheetApp.flush();try{projectMovement_(m);put_('DEPOSITOS',Object.assign({},t,{stockMl:m.after}));SpreadsheetApp.flush();}catch(err){console.error('Projeções pendentes de reconciliação: '+m.id);}
 return {id:m.id,message:kind==='SAIDA'?'Abastecimento registado com sucesso.':'Movimento registado com sucesso.'};
 });}
