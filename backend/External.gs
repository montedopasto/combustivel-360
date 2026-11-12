/* Separate append-only ledger. External refuellings never affect tank stocks/costs. */
function externalRows_(){return sheet_('ABASTECIMENTOS_EXTERNOS')?rows_('ABASTECIMENTOS_EXTERNOS'):[];}
function externalReady_(){const n='ABASTECIMENTOS_EXTERNOS',s=sheet_(n)||db_().insertSheet(n);if(!s.getLastRow()){s.appendRow(SHEETS_[n]);s.setFrozenRows(1);}assert_(s.getRange(1,1,1,SHEETS_[n].length).getValues()[0].every((v,i)=>v===SHEETS_[n][i]),'Estrutura dos abastecimentos externos inválida. Contacte o Administrador.');}
function externalEffective_(ledger){
 const records=new Map();
 for(const row of ledger){
  if(row.kind==='REGISTO')records.set(row.id,Object.assign({},row,{revision:row.id}));
  if(row.kind==='ANULACAO')records.delete(row.root);
  if(row.kind==='EDICAO'&&records.has(row.root)){
   const original=records.get(row.root);
   const {date,vehicleId,plate,vehicleName,litresMl}=row;
   records.set(row.root,Object.assign({},original,{date,vehicleId,plate,vehicleName,litresMl,revision:row.id}));
  }
 }
 return Array.from(records.values());
}
function externalWrite_(p,cancel,edit=false){return lock_(()=>{const u=session_(p.token);if(cancel||edit)admin_(u,p);assert_(/^[a-f0-9-]{32,64}$/.test(p.operationId||''),'Identificador de operação inválido.');externalReady_();const ledger=externalRows_();const fingerprint=hex_(sha_(bytes_(JSON.stringify({cancel:!!cancel,...(edit?{edit:true,revision:p.revision}:{}),date:p.date,plate:p.plate,vehicleIdentification:p.vehicleIdentification,vehicleId:p.vehicleId,litres:p.litres,root:p.root,reason:p.reason}))));const prior=ledger.find(r=>r.id===p.operationId);if(prior){assert_(prior.userId===u.id&&prior.fingerprint===fingerprint,'Identificador já utilizado para outra operação.');return {id:prior.id,message:'Operação já registada com sucesso.'};}
 const r={id:p.operationId,kind:cancel?'ANULACAO':edit?'EDICAO':'REGISTO',fingerprint,at:new Date().toISOString(),userId:u.id,userName:u.name};
 if(cancel){const original=externalEffective_(ledger).find(x=>x.id===p.root);assert_(original,'Registo inexistente ou já anulado.');r.root=original.id;r.reason=text_(p.reason,500);assert_(r.reason,'Justificação obrigatória.');Object.assign(r,{date:original.date,vehicleId:original.vehicleId,plate:original.plate,vehicleName:original.vehicleName,litresMl:original.litresMl});}
 else{
  let original;
  if(edit){
   original=externalEffective_(ledger).find(x=>x.id===p.root);
   assert_(original,'Registo inexistente ou já anulado.');
   assert_(original.revision===p.revision,'Este registo foi alterado. Atualize a consulta antes de editar.');
   r.root=original.id;
  }
  r.date=dateInput_(p.date);assert_(r.date<=dateKey_(r.at),'A data do abastecimento não pode ser futura.');const sameVehicle=original&&!p.vehicleId&&(original.plate
   ? p.plate===original.plate&&!p.vehicleIdentification
   : !p.plate&&p.vehicleIdentification===original.vehicleName);
  const identity=sameVehicle
   ? {vehicleId:original.vehicleId,plate:original.plate,vehicleName:original.vehicleName}
   : vehicleIdentity_(p);
  Object.assign(r,identity);
  r.litresMl=amount_(p.litres);}
 append_('ABASTECIMENTOS_EXTERNOS',r);SpreadsheetApp.flush();return {id:r.id,message:cancel?'Registo anulado com histórico conservado.':edit?'Abastecimento externo atualizado.':'Abastecimento externo registado com sucesso.'};
 });}
function externalReport_(filters){const f=filters||{},start=f.start?dateInput_(f.start):'',end=f.end?dateInput_(f.end):'';assert_(!start||!end||start<=end,'A data inicial deve ser anterior à data final.');const ledger=externalRows_();const all=externalEffective_(ledger);const rows=all.filter(r=>(!start||r.date>=start)&&(!end||r.date<=end)&&(!f.vehicleId||r.vehicleId===f.vehicleId)&&(!f.userId||r.userId===f.userId)).sort((a,b)=>a.date.localeCompare(b.date)||a.at.localeCompare(b.at));const byVehicle={};const occurrences={};all.forEach(r=>{const k=r.date+':'+r.vehicleId+':'+r.litresMl;occurrences[k]=(occurrences[k]||0)+1;});rows.forEach(r=>{const g=byVehicle[r.vehicleId]||(byVehicle[r.vehicleId]={id:r.vehicleId,name:vehicleLabel_(r),litresMl:0,count:0});g.litresMl+=r.litresMl??0;g.count++;});return {issuedAt:new Date().toISOString(),filters:{start,end,vehicleId:f.vehicleId||'',userId:f.userId||''},rows:rows.map(r=>Object.assign({},r,{possibleDuplicate:occurrences[r.date+':'+r.vehicleId+':'+r.litresMl]>1})),totalLitres:rows.reduce((n,r)=>n+(r.litresMl??0),0)/1000,count:rows.length,vehicles:Object.values(byVehicle).map(v=>({id:v.id,name:v.name,litres:v.litresMl/1000,count:v.count})),catalog:{vehicles:vehicleCatalogue_(ledger),users:rows_('UTILIZADORES').map(publicUser_)}};}
function externalTable_(report){return [['Data do abastecimento','Veículo / matrícula','Litros','Colaborador','Data do registo','Verificação'],...report.rows.map(r=>[r.date,vehicleLabel_(r),r.litresMl==null?'':r.litresMl/1000,r.userName,Utilities.formatDate(new Date(r.at),'Europe/Lisbon','dd/MM/yyyy HH:mm'),r.possibleDuplicate?'Rever: data, veículo e litros repetidos':''])];}
function externalHtml_(r){return '<!doctype html><html lang="pt-PT"><meta charset="utf-8"><style>body{font:11px Arial;color:#17251e;margin:28px}h1{border-bottom:4px solid #2b8159;padding-bottom:12px;font-size:24px}table{border-collapse:collapse;width:100%;font-size:9px}td,th{padding:7px;border-bottom:1px solid #ddd;text-align:left}th{background:#e8f1ea}</style><h1>COMBUSTÍVEL 360</h1><p>Monte do Pasto · Abastecimentos externos · Conferência com fatura<br>Período: '+escape_(r.filters.start||'Início')+' a '+escape_(r.filters.end||'Hoje')+'<br>Emissão: '+escape_(Utilities.formatDate(new Date(r.issuedAt),'Europe/Lisbon','dd/MM/yyyy HH:mm'))+'<br>Filtros: '+escape_(JSON.stringify(r.filters))+'</p><h2>'+r.count+' abastecimentos · '+r.totalLitres.toLocaleString('pt-PT',{maximumFractionDigits:3})+' litros</h2><h2>Detalhe</h2><table>'+externalTable_(r).map((row,i)=>'<tr>'+row.map(v=>'<'+(i?'td':'th')+'>'+escape_(v)+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('')+'</table><h2>Totais por veículo</h2>'+objectTable_(r.vehicles.map(v=>({veiculo:v.name,abastecimentos:v.count,litros:v.litres})))+'<p>Não altera existências dos depósitos. Uma repetição é um sinal para conferir com os documentos, não uma conclusão de duplicação. Registos anulados não integram os totais; o histórico permanece conservado. Não contém preços ou custos.</p></html>';}
function externalExport_(filters,format){assert_(['pdf','xlsx'].includes(format),'Formato inválido.');const r=externalReport_(filters);let blob;
 if(format==='pdf')blob=Utilities.newBlob(externalHtml_(r),'text/html','externos.html').getAs('application/pdf').setName('combustivel-360-externos.pdf');
 else{const temp=SpreadsheetApp.create('COMBUSTÍVEL 360 — Abastecimentos externos');try{const sheet=temp.getSheets()[0];sheet.setName('Detalhe');const data=[['COMBUSTÍVEL 360 — Monte do Pasto'],['Abastecimentos externos — conferência com fatura'],['Período',r.filters.start||'Início',r.filters.end||'Hoje'],['Emissão',r.issuedAt],['Filtros',JSON.stringify(r.filters)],['Total de litros',r.totalLitres],['Número de abastecimentos',r.count],[],...externalTable_(r)];const width=Math.max(...data.map(row=>row.length));sheet.getRange(1,1,data.length,width).setValues(data.map(row=>Array.from({length:width},(_,i)=>safeCell_(row[i]??''))));sheet.getRange(1,1,1,width).setFontWeight('bold');const totals=temp.insertSheet('Totais por veículo'),summary=[['Veículo / matrícula','Litros','Abastecimentos'],...r.vehicles.map(v=>[v.name,v.litres,v.count])];totals.getRange(1,1,summary.length,3).setValues(summary.map(row=>row.map(safeCell_)));SpreadsheetApp.flush();const response=UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/'+temp.getId()+'/export?format=xlsx',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});assert_(response.getResponseCode()===200,'Exportação indisponível. Tente novamente.');blob=response.getBlob().setName('combustivel-360-externos.xlsx');}finally{DriveApp.getFileById(temp.getId()).setTrashed(true);}}
 return {name:blob.getName(),mime:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:Utilities.base64Encode(blob.getBytes())};}
