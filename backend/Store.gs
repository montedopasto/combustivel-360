const SHEETS_ = {
 ABASTECIMENTOS_EXTERNOS:['ID','Tipo','Data do abastecimento','Veículo / matrícula','Litros','Colaborador','Data do registo','Referência','Motivo','JSON'],
 UTILIZADORES:['ID','Nome','PIN protegido','Perfil','Estado','Data de criação','JSON'],
 DEPOSITOS:['ID','Nome','Capacidade','Stock inicial','Stock mínimo','Stock atual','Estado','Data de inicialização','JSON'],
 VEICULOS:['ID','Matrícula','Descrição','Estado','Data de criação','JSON'],
 ENTRADAS:['ID','Data','Depósito','Fornecedor','Litros','Preço por litro','Custo total','Utilizador','Estado','JSON'],
 ABASTECIMENTOS:['ID','Data','Hora','Depósito','Matrícula','Litros','Colaborador','Estado','JSON'],
 ACERTOS:['ID','Data','Depósito','Stock anterior','Stock medido','Diferença','Motivo','Utilizador','JSON'],
 MOVIMENTOS:['ID','Data/hora','Tipo','Depósito','Referência de origem','Quantidade com sinal','Stock anterior','Stock posterior','Utilizador','Estado','JSON'],
 CORRECOES:['ID','Data/hora','Registo original','Dados anteriores','Dados novos','Tipo de alteração','Administrador','Motivo','JSON'],
 CONFIGURACOES:['ID','Parâmetros gerais','JSON'],
 ALERTAS:['ID','Data','Tipo','Depósito','Descrição','Estado','Data do último envio','JSON'],
 PREVISOES:['ID','Data de cálculo','Depósito','Consumo previsto','Autonomia','Data estimada de reposição','Quantidade recomendada','Confiança','JSON']
};
function props_(){return PropertiesService.getScriptProperties();}
function db_(){const id=props_().getProperty('SPREADSHEET_ID'); assert_(id,'Configuração pendente pelo proprietário.');return SpreadsheetApp.openById(id);}
function sheet_(name){return db_().getSheetByName(name);}
function rows_(name){const s=sheet_(name); if(s.getLastRow()<2)return [];return s.getRange(2,SHEETS_[name].length,s.getLastRow()-1,1).getValues().map(r=>JSON.parse(r[0]));}
function safeCell_(x){return typeof x==='string'&&/^[=+\-@]/.test(x)?"'"+x:x;}
function viewRow_(name,o){
 const base={ABASTECIMENTOS_EXTERNOS:()=>[o.id,o.kind,o.date,vehicleLabel_(o),o.litresMl/1000,o.userName,o.at,o.root||o.id,o.reason||''],UTILIZADORES:()=>[o.id,o.name,JSON.stringify(o.pin),o.role,o.active?'Ativo':'Inativo',o.at],DEPOSITOS:()=>[o.id,o.name,o.capacityMl/1000,o.initialMl/1000,o.minimumMl/1000,(o.stockMl==null?o.initialMl:o.stockMl)/1000,o.active?'Ativo':'Inativo',o.at],VEICULOS:()=>[o.id,o.plate,o.description,o.active?'Ativo':'Inativo',o.at],MOVIMENTOS:()=>[o.id,o.at,o.kind,o.tankId,o.root||o.id,o.delta/1000,o.before/1000,o.after/1000,o.userName,o.status||'Confirmado'],ENTRADAS:()=>[o.id,o.deliveryDate,o.tankId,o.supplier,o.delta/1000,o.priceMicro/1e6,roundMoney_(o.delta*o.priceMicro/1e9),o.userName,o.status||'Confirmado'],ABASTECIMENTOS:()=>[o.id,dateKey_(o.at),Utilities.formatDate(new Date(o.at),'Europe/Lisbon','HH:mm:ss'),o.tankId,vehicleLabel_(o),-o.delta/1000,o.userName,o.status||'Confirmado'],ACERTOS:()=>[o.id,o.at,o.tankId,o.before/1000,o.measuredMl/1000,o.delta/1000,o.reason,o.userName],CORRECOES:()=>[o.id,o.at,o.root,JSON.stringify(o.previous),JSON.stringify(o.next),o.kind,o.userName,o.reason],CONFIGURACOES:()=>[o.id,JSON.stringify(o)],ALERTAS:()=>[o.id,o.at,o.kind,o.tankId,o.description,o.status,o.sentAt||''],PREVISOES:()=>[o.id,o.at,o.tankId,o.daily,o.autonomy,o.minimumDate||'',o.quantity,o.confidence]};
 return base[name]().map(v=>safeCell_(v==null?'':v)).concat(JSON.stringify(o));
}
function append_(name,o){sheet_(name).appendRow(viewRow_(name,o));}
function put_(name,o){const s=sheet_(name), vals=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,1).getValues():[];const i=vals.findIndex(r=>r[0]===o.id);if(i<0)append_(name,o);else s.getRange(i+2,1,1,SHEETS_[name].length).setValues([viewRow_(name,o)]);}
function lock_(fn){const l=LockService.getScriptLock();assert_(l.tryLock(30000),'Sistema ocupado. Tente novamente com a mesma operação.');try{return fn();}finally{l.releaseLock();}}
function config_(){return rows_('CONFIGURACOES')[0]||{id:'geral',safetyDays:2,emails:[],alerts:true};}
function tanks_(){return balances_(rows_('DEPOSITOS'),rows_('MOVIMENTOS'));}
/* Ledger append is the commit point; projections can always be rebuilt. */
function reconcile_(){const ledger=rows_('MOVIMENTOS'); balances_(rows_('DEPOSITOS'),ledger).forEach(t=>put_('DEPOSITOS',t));
 ledger.forEach(projectMovement_);SpreadsheetApp.flush();}
/* Run in the private editor only. All functions ending _ are inaccessible to google.script.run. */
function instalar_(){return lock_(()=>{const s=db_();s.setSpreadsheetTimeZone('Europe/Lisbon');Object.keys(SHEETS_).forEach(n=>{const sh=s.getSheetByName(n)||s.insertSheet(n);if(sh.getLastRow()===0){sh.appendRow(SHEETS_[n]);sh.setFrozenRows(1);sh.getRange(1,1,1,SHEETS_[n].length).setFontWeight('bold').setBackground('#16382d').setFontColor('#ffffff');}});if(!props_().getProperty('PIN_PEPPER'))props_().setProperty('PIN_PEPPER',random_());if(!props_().getProperty('BOOTSTRAP_TOKEN')&&!rows_('UTILIZADORES').length)props_().setProperty('BOOTSTRAP_TOKEN',random_());if(!rows_('CONFIGURACOES').length)put_('CONFIGURACOES',config_());return 'Folhas preparadas. Consulte BOOTSTRAP_TOKEN nas propriedades privadas do script.';});}
function instalarAcionadores_(){const names=['verificarAlertas_','relatorioMensal_'];ScriptApp.getProjectTriggers().filter(t=>names.includes(t.getHandlerFunction())).forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger('verificarAlertas_').timeBased().everyHours(6).create();ScriptApp.newTrigger('relatorioMensal_').timeBased().onMonthDay(1).atHour(8).inTimezone('Europe/Lisbon').create();}
function reconciliar_(){return lock_(()=>{reconcile_();return 'Saldos e projeções reconciliados.';});}

function projectMovement_(m){if(m.kind==='ENTRADA')put_('ENTRADAS',m);if(m.kind==='SAIDA')put_('ABASTECIMENTOS',m);if(m.kind==='ACERTO')put_('ACERTOS',m);if(['CORRECAO','ANULACAO'].includes(m.kind)){put_('CORRECOES',m);const old=m.previous;if(old){const source=old.kind==='SAIDA'?'ABASTECIMENTOS':old.kind==='ENTRADA'?'ENTRADAS':'ACERTOS';const original=rows_(source).find(x=>x.id===m.root);if(original)put_(source,Object.assign({},original,{status:m.next?'Corrigido':'Anulado'}));}}}
