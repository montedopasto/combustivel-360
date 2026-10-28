/* Domain logic: integer millilitres, integer micro-euros/litre, append-only ledger. */
function fail_(message) { const error=new Error(message);error.definitive=true;throw error; }
function assert_(value, message) { if (!value) fail_(message); }
function text_(v, max) { const s = String(v == null ? '' : v).trim(); assert_(s.length <= (max || 200), 'Texto demasiado longo.'); return s; }
function amount_(v, zero) { assert_(typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 10000000, 'Quantidade inválida.'); const n = Math.round(v * 1000); assert_(Math.abs(v * 1000 - n) < 0.00001 && (zero ? n >= 0 : n > 0), 'Use litros positivos com até três casas decimais.'); return n; }
function plate_(v) { return text_(v, 24).toUpperCase().replace(/\s/g, ''); }
function dateKey_(v) { return Utilities.formatDate(new Date(v), 'Europe/Lisbon', 'yyyy-MM-dd'); }
function dateInput_(v) { const s = text_(v, 10); assert_(/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s, 'Data inválida.'); return s; }
function roundMoney_(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }
function effective_(ledger) {
  const result = {};
  ledger.forEach(m => { if (m.kind === 'CORRECAO' || m.kind === 'ANULACAO') { if (m.next) result[m.root] = m.next; else delete result[m.root]; } else result[m.id] = m; });
  return Object.values(result).sort((a,b) => a.at.localeCompare(b.at));
}
function balances_(tanks, ledger) {
  return tanks.map(t => { const ml = ledger.filter(m => m.tankId === t.id).reduce((s,m) => s + m.delta, t.initialMl); return Object.assign({}, t, {stockMl:ml}); });
}
function costed_(tanks, ledger) {
  const state = {}; tanks.forEach(t => state[t.id] = {ml:t.initialMl, value:t.initialCostMicro == null && t.initialMl ? null : t.initialMl * (t.initialCostMicro || 0) / 1e9});
  return effective_(ledger).map(m => {
    const s = state[m.tankId]; if (!s) return m;
    let cost = null;
    if (m.kind === 'ENTRADA') { cost = m.delta * m.priceMicro / 1e9; s.value = s.value == null && s.ml ? null : (s.value || 0) + cost; }
    else { const avg = s.ml > 0 && s.value != null ? s.value / s.ml : (s.ml === 0 ? 0 : null); cost = avg == null ? null : Math.abs(m.delta) * avg; if (s.value != null) s.value += m.delta * (avg || 0); }
    s.ml += m.delta; if (s.ml === 0) s.value = 0;
    return Object.assign({}, m, {cost:cost == null ? null : roundMoney_(cost)});
  });
}
function filter_(rows, f) {
  f = f || {}; const start = f.start ? dateInput_(f.start) : ''; const end = f.end ? dateInput_(f.end) : '';
  assert_(!start || !end || start <= end, 'Período inválido.');
  return rows.filter(m => { const d = f.recorded ? dateKey_(m.at) : (m.deliveryDate || dateKey_(m.at)); return (!start || d >= start) && (!end || d <= end) && (!f.tankId || m.tankId === f.tankId) && (!f.vehicleId || m.vehicleId === f.vehicleId) && (!f.userId || m.userId === f.userId) && (!f.kind || m.kind === f.kind); });
}
function forecast_(tank, records, config, now) {
  now = new Date(now); const today = dateKey_(now); const all = records.filter(m => m.tankId === tank.id && m.kind === 'SAIDA');
  const days = Array.from({length:30}, (_,i) => { const d = dateKey_(new Date(now.getTime() - (29-i)*86400000)); return all.filter(m => dateKey_(m.at) === d).reduce((s,m) => s - m.delta/1000,0); });
  const first = all.length ? Math.min(...all.map(m => Date.parse(m.at))) : now.getTime(); const historyDays = Math.max(1, Math.floor((now-first)/86400000)+1);
  const n = Math.min(historyDays,30); const avg30 = days.slice(-n).reduce((a,b)=>a+b,0)/n; const avg7 = days.slice(-Math.min(historyDays,7)).reduce((a,b)=>a+b,0)/Math.min(historyDays,7);
  const trend = avg30 ? Math.max(0.5,Math.min(1.5,avg7/avg30)) : 1;
  let seasonal = 1; const month = today.slice(5,7); const years = new Set(all.map(m=>dateKey_(m.at).slice(0,4)));
  if (historyDays >= 730 && years.size >= 3) { const totals = {}; all.forEach(m=>{const k=dateKey_(m.at).slice(0,7); totals[k]=(totals[k]||0)-m.delta/1000;}); const vals=Object.values(totals); const same=Object.entries(totals).filter(([k])=>k.slice(5)===month && k<today.slice(0,7)).map(([,v])=>v); if(same.length>=2) seasonal=Math.max(0.6,Math.min(1.6,(same.reduce((a,b)=>a+b,0)/same.length)/(vals.reduce((a,b)=>a+b,0)/vals.length||1))); }
  const daily = (avg30*.6+avg7*.4)*Math.sqrt(trend)*seasonal;
  const deviation = Math.sqrt(days.slice(-n).reduce((s,x)=>s+(x-avg30)**2,0)/n); const cv=avg30?deviation/avg30:0;
  const toMinimum = daily > 0 ? Math.max(0,(tank.stockMl-tank.minimumMl)/1000/daily) : null;
  const autonomy = daily > 0 ? tank.stockMl/1000/daily : null;
  const minimumDate = toMinimum == null ? null : dateKey_(new Date(now.getTime()+Math.floor(toMinimum)*86400000));
  const orderDate = toMinimum == null ? null : dateKey_(new Date(now.getTime()+Math.floor(toMinimum-5-config.safetyDays)*86400000));
  const quantity = daily > 0 ? Math.max(0,Math.min(tank.capacityMl/1000, (tank.capacityMl-tank.stockMl)/1000+daily*5)) : 0;
  const state = tank.stockMl<=tank.minimumMl ? 'MINIMO' : toMinimum!=null && toMinimum<5 ? 'CRITICO' : toMinimum!=null && toMinimum<=5+config.safetyDays ? 'ENCOMENDAR' : 'NORMAL';
  return {tankId:tank.id, daily:Math.round(daily*100)/100, avg7, avg30, trend, seasonal:seasonal!==1, historyDays, confidence:historyDays<30?'Preliminar':historyDays<90||cv>1?'Baixa':'Moderada', autonomy, toMinimum, minimumDate, orderDate, quantity:Math.round(quantity), state, note: !all.length?'Sem consumos: previsão indisponível.':`Média de ${daily.toFixed(1)} L/dia; prazo de entrega de 5 dias e margem de ${config.safetyDays} dias. ${historyDays<730?'Histórico insuficiente para comprovar sazonalidade.':'Sazonalidade apenas aplicada com dois anos comparáveis.'}`};
}
function anomalies_(records) {
  const out=[]; const groups={}; records.filter(m=>m.kind==='SAIDA').forEach(m=>(groups[m.vehicleId]||(groups[m.vehicleId]=[])).push(m));
  Object.values(groups).forEach(list=>{ list.sort((a,b)=>a.at.localeCompare(b.at)); list.forEach((m,i)=>{ const prev=list.slice(Math.max(0,i-30),i); const avg=prev.reduce((s,x)=>s-x.delta,0)/(prev.length||1); const sd=Math.sqrt(prev.reduce((s,x)=>s+(-x.delta-avg)**2,0)/(prev.length||1)); if(prev.length>=10 && -m.delta>avg+3*sd && -m.delta>avg*1.5) out.push({id:m.id, text:`${vehicleLabel_(m)}: ${-m.delta/1000} L; referência ${(avg/1000).toFixed(1)} L (${prev.length} abastecimentos). Consumo elevado a verificar.`,confidence:'Moderada'}); if(i && Date.parse(m.at)-Date.parse(list[i-1].at)<30*60000) out.push({id:m.id,text:`${vehicleLabel_(m)}: dois abastecimentos em menos de 30 minutos. Confirmar contexto operacional.`,confidence:'Temporal'}); }); });
  const byTank={};records.forEach(m=>(byTank[m.tankId]||(byTank[m.tankId]=[])).push(m));
  Object.entries(byTank).forEach(([id,list])=>{const sorted=list.slice().sort((a,b)=>a.at.localeCompare(b.at));const measures=sorted.filter(m=>m.kind==='ACERTO').slice(-3);if(measures.length===3&&measures.every(m=>m.delta<0))out.push({id,text:`${id}: três medições consecutivas com diferenças negativas; total ${(-measures.reduce((s,m)=>s+m.delta,0)/1000).toFixed(1)} L. Verificar medição e contexto operacional.`,confidence:'Moderada'});const now=Date.now();const recent=sorted.filter(m=>m.kind==='SAIDA'&&Date.parse(m.at)>=now-7*86400000).reduce((s,m)=>s-m.delta/1000,0)/7;const previous=sorted.filter(m=>m.kind==='SAIDA'&&Date.parse(m.at)<now-7*86400000&&Date.parse(m.at)>=now-30*86400000);const ref=previous.reduce((s,m)=>s-m.delta/1000,0)/23;if(previous.length>=10&&ref>0&&recent>ref*1.5)out.push({id,text:`${id}: consumo recente ${recent.toFixed(1)} L/dia, face a ${ref.toFixed(1)} L/dia nas três semanas anteriores. Aumento a contextualizar.`,confidence:'Moderada'});});
  return out.slice(-100);
}

function vehicleLabel_(v){return v.plate||v.vehicleName||v.description||'—';}
function vehicleIdentity_(p){
 const vehicles=rows_('VEICULOS');const plate=plate_(p.plate),name=text_(p.vehicleIdentification,120).replace(/\s+/g,' ');assert_(!(plate&&name)&&!(p.vehicleId&&(plate||name)),'Indique apenas uma identificação do veículo.');
 let v;if(p.vehicleId){v=vehicles.find(x=>x.id===p.vehicleId);assert_(v&&v.active,'Veículo inexistente ou desativado.');return {vehicleId:v.id,plate:v.plate||'',vehicleName:v.description||''};}
 if(plate){assert_(/^[A-Z0-9-]{3,24}$/.test(plate),'Matrícula inválida.');const key=plate.replace(/-/g,'');v=vehicles.find(x=>x.plate&&plate_(x.plate).replace(/-/g,'')===key);assert_(!v||v.active,'Veículo desativado.');return {vehicleId:v?v.id:'livre-'+hex_(sha_(bytes_('plate:'+key))).slice(0,32),plate:v?v.plate:plate,vehicleName:v?v.description:''};}
 assert_(name.length>=3,'Identifique o veículo sem matrícula (mínimo de 3 caracteres).');const key=name.toLocaleUpperCase('pt-PT');v=vehicles.find(x=>!x.plate&&String(x.description).trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-PT')===key);assert_(!v||v.active,'Veículo desativado.');return {vehicleId:v?v.id:'livre-'+hex_(sha_(bytes_('name:'+key))).slice(0,32),plate:'',vehicleName:v?v.description:name};
}
