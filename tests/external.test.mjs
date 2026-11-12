import test from 'node:test';import assert from 'node:assert/strict';import {harness} from './harness.mjs';
import {dateCandidates,litreCandidates} from '../frontend/photo-readings.js';
function register(h,data={},token=h.tokens.worker,id=h.crypto.randomUUID()){return h.call(token,'externalRegister',{operationId:id,date:'2024-01-15',plate:'AA-00-AA',litres:640,...data});}
test('collaborator records 640 external litres, author/server time preserved and tanks/consumption ledger unchanged',()=>{const h=harness();const before=JSON.stringify(h.ctx.tanks_());const r=register(h);const saved=h.ctx.externalRows_()[0];assert.equal(saved.id,r.id);assert.equal(saved.litresMl,640000);assert.equal(saved.date,'2024-01-15');assert.equal(saved.userId,'colaborador');assert.ok(saved.at.startsWith(new Date().getUTCFullYear().toString()));assert.equal(JSON.stringify(h.ctx.tanks_()),before);assert.equal(h.ctx.rows_('MOVIMENTOS').length,0);assert.equal(h.ctx.rows_('ABASTECIMENTOS').length,0);assert.equal(h.ctx.sheet_('ABASTECIMENTOS_EXTERNOS').data[1][4],640);assert.ok(!('image' in saved)&&!('price' in saved));});
test('external endpoints enforce profiles, sessions and deactivation',()=>{const h=harness();register(h);for(const action of ['externalReport','externalExport','externalCancel'])assert.throws(()=>h.call(h.tokens.worker,action,{}),/autorizado/);assert.throws(()=>h.call(h.tokens.manager,'externalCancel',{}),/autorizado/);assert.equal(h.call(h.tokens.manager,'externalReport',{}).count,1);assert.throws(()=>h.call('invalid','externalRegister',{}),/Sessão/);const user=h.ctx.rows_('UTILIZADORES').find(u=>u.id==='colaborador');user.active=false;h.ctx.put_('UTILIZADORES',user);assert.throws(()=>register(h),/Sessão/);});
test('external validation requires real date, positive quantities and vehicle identification',()=>{const h=harness();for(const date of ['', '2024-02-30','2099-01-01'])assert.throws(()=>register(h,{date}),/Data|data/);for(const litres of [0,-1,NaN,0.00001])assert.throws(()=>register(h,{litres}));assert.throws(()=>register(h,{plate:''}),/Identifique/);register(h,{plate:undefined,vehicleIdentification:'Máquina agrícola 3',litres:25.5});assert.equal(h.ctx.externalRows_()[0].vehicleName,'Máquina agrícola 3');});
test('external idempotency survives an interrupted response and rejects changed date, vehicle or quantity',()=>{const h=harness(),id=h.crypto.randomUUID();h.state.flushFail=true;assert.throws(()=>register(h,{},h.tokens.worker,id),/Injected/);h.state.flushFail=false;register(h,{},h.tokens.worker,id);assert.equal(h.ctx.externalRows_().length,1);for(const changed of [{date:'2024-01-16'},{plate:'BB-22-CC'},{litres:64}])assert.throws(()=>register(h,changed,h.tokens.worker,id),/outra operação/);assert.equal(h.ctx.externalRows_().length,1);assert.equal(h.state.locked,false);});
test('external date/vehicle/user filters use delivery date inclusively, not registration month, with detailed export totals',()=>{const h=harness();register(h);register(h,{date:'2024-01-31',litres:64});register(h,{date:'2024-02-01',litres:20});register(h,{plate:'ZZ-22-ZZ',litres:30});register(h,{litres:10},h.tokens.manager);const vehicle=h.ctx.externalRows_()[0].vehicleId;const r=h.call(h.tokens.manager,'externalReport',{filters:{start:'2024-01-15',end:'2024-01-31',vehicleId:vehicle,userId:'colaborador'}});assert.equal(r.count,2);assert.equal(r.totalLitres,704);assert.equal(r.vehicles[0].litres,704);const table=h.ctx.externalTable_(r);assert.equal(table.length,3);assert.equal(table[1][0],'2024-01-15');assert.equal(table[1][2],640);assert.ok(h.ctx.externalHtml_(r).includes('Conferência com fatura'));assert.ok(h.ctx.externalHtml_(r).includes('2024-01-31'));assert.throws(()=>h.ctx.externalReport_({start:'2024-02-01',end:'2024-01-01'}),/inicial/);});
test('external cancellation is append-only, admin-only and excluded from totals while repeated values flagged for checking',()=>{const h=harness();const first=register(h);register(h);assert.ok(h.ctx.externalReport_({}).rows.every(r=>r.possibleDuplicate));const id=h.crypto.randomUUID(),payload={operationId:id,root:first.id,reason:'Guia lançada duas vezes'};h.call(h.tokens.admin,'externalCancel',payload);h.call(h.tokens.admin,'externalCancel',payload);assert.equal(h.ctx.externalRows_().length,3);assert.equal(h.ctx.externalRows_()[2].reason,payload.reason);assert.equal(h.ctx.externalReport_({}).totalLitres,640);assert.equal(h.ctx.externalReport_({}).rows[0].possibleDuplicate,false);assert.throws(()=>h.call(h.tokens.admin,'externalCancel',{...payload,operationId:h.crypto.randomUUID()}),/anulado/);assert.equal(h.ctx.rows_('MOVIMENTOS').length,0);});
test('external schema is created lazily without data loss and damaged headers are rejected',()=>{const h=harness();delete h.state.sheets.ABASTECIMENTOS_EXTERNOS;assert.equal(h.ctx.externalReport_({}).count,0);register(h);assert.equal(h.ctx.externalRows_().length,1);h.state.sheets.ABASTECIMENTOS_EXTERNOS.data[0][2]='Unexpected';assert.throws(()=>register(h),/Estrutura/);assert.equal(h.ctx.externalRows_().length,1);});
test('receipt dates accept four-digit year formats and never infer decimal scale of 640 litres',()=>{for(const text of ['2026/10/28','28/10/2026','28-10-2026'])assert.deepEqual(dateCandidates(text),['2026-10-28']);assert.deepEqual(dateCandidates('26/10/28'),[]);assert.deepEqual(dateCandidates('31/02/2024'),[]);assert.deepEqual(dateCandidates('28/10/2026 29/10/2026'),['2026-10-28','2026-10-29']);assert.deepEqual(litreCandidates('640'),[640]);});

test('external reports keep historical quantities blank when they were never entered', () => {
  const h = harness();
  register(h, {litres:42.91});
  const saved = h.ctx.externalRows_()[0];
  delete saved.litresMl;
  h.ctx.put_('ABASTECIMENTOS_EXTERNOS',saved);
  register(h, {date:'2024-01-16',litres:42.91});
  const report=h.ctx.externalReport_({});
  assert.equal(report.totalLitres,42.91);
  assert.equal(report.vehicles[0].litres,42.91);
  assert.equal(h.ctx.externalTable_(report)[1][2],'');
  assert.equal(h.ctx.externalTable_(report)[2][2],42.91);
});

test('admin edits a historical external record once, with audit history and original author', () => {
  const h = harness();
  const original = register(h);
  const saved = h.ctx.externalRows_()[0];
  delete saved.litresMl;
  h.ctx.put_('ABASTECIMENTOS_EXTERNOS', saved);
  const payload = {root:original.id, revision:original.id, date:'2024-01-16',
    plate:'BB-22-CC', litres:42.91, operationId:h.crypto.randomUUID()};
  assert.throws(() => h.call(h.tokens.worker,'externalEdit',payload),/autorizado/);
  assert.throws(() => h.call(h.tokens.manager,'externalEdit',payload),/autorizado/);
  h.call(h.tokens.admin,'externalEdit',payload);
  h.call(h.tokens.admin,'externalEdit',payload);
  assert.equal(h.ctx.externalRows_().length,2);
  assert.equal(h.ctx.externalRows_()[0].litresMl,undefined);
  assert.equal(h.ctx.externalRows_()[1].kind,'EDICAO');
  assert.equal(h.ctx.externalRows_()[1].userId,'administrador');
  const report=h.ctx.externalReport_({});
  assert.equal(report.totalLitres,42.91);
  assert.equal(report.count,1);
  assert.equal(report.rows[0].id,original.id);
  assert.equal(report.rows[0].userId,'colaborador');
  assert.equal(report.rows[0].plate,'BB-22-CC');
  assert.equal(report.rows[0].date,'2024-01-16');
  assert.throws(()=>h.call(h.tokens.admin,'externalEdit',{...payload,operationId:h.crypto.randomUUID()}),/alterado/);
  h.call(h.tokens.admin,'externalCancel',{root:original.id,reason:'Teste',operationId:h.crypto.randomUUID()});
  assert.equal(h.ctx.externalReport_({}).count,0);
});

test('overview combines effective external fuel with internal consumption without changing stock or forecasts', () => {
  const h=harness();
  const today=h.ctx.dateKey_(new Date());
  const before=h.ctx.overview_({});
  register(h,{date:today,litres:42.91});
  const cancelled=register(h,{date:today,litres:15});
  h.call(h.tokens.admin,'externalCancel',{root:cancelled.id,reason:'Teste',operationId:h.crypto.randomUUID()});
  const after=h.ctx.overview_({});
  assert.equal(after.consumption.externalMonth,42.91);
  assert.equal(after.consumption.month,before.consumption.month+42.91);
  assert.equal(after.consumption.days.find(row=>row.key===today).external,42.91);
  assert.equal(after.kpi.stock,before.kpi.stock);
  assert.equal(JSON.stringify(after.forecasts),JSON.stringify(before.forecasts));
});

test('fleet groups historic internal and external fuel by normalized plate and model',()=>{
 const h=harness();
 const data=h.ctx.consumptionOverview_(
  [{kind:'SAIDA',at:'2024-01-15T12:00:00Z',plate:'AA-00-AA',vehicleId:'original',delta:-20000}],
  {rows:[{date:'2024-01-16',plate:'AA00AA',vehicleId:'external',litresMl:30000},{date:'2024-01-16',plate:'AA00AA'}]},
  '2024-01-31',[{id:'registered',plate:'AA-00-AA',brand:'Ford',model:'Ranger'}]);
 const january=data.fleetMonths[0];
 assert.equal(january.vehicles.length,1);
 assert.equal(january.vehicles[0].litres,50);
 assert.equal(january.vehicles[0].average,25);
 assert.equal(january.models[0].name,'Ford Ranger');
 assert.equal(january.models[0].count,2);
 assert.equal(data.missingMonth,1);
});

test('daily estimate excludes the opening fill and needs a spread of at least three days',()=>{
 const h=harness();
 const rows=[
  {date:'2024-01-05',plate:'AA00AA',litresMl:90000},
  {date:'2024-01-10',plate:'AA00AA',litresMl:30000},
  {date:'2024-01-11',plate:'BB00BB',litresMl:50000}
 ];
 const result=h.ctx.consumptionOverview_([],{rows},'2024-01-12');
 assert.equal(result.dailyEstimates[0].estimate,6);
 assert.equal(result.dailyEstimates[1].estimate,null);
});
