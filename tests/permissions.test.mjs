import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './harness.mjs';

test('external access belongs to one account and overview never leaks its figures',()=>{
 const h=harness();
 h.state.properties.EXTERNAL_USER_ID='administrador';
 const date=h.ctx.dateKey_(new Date());
 h.call(h.tokens.admin,'externalRegister',{date,plate:'AA-00-AA',litres:123,operationId:h.crypto.randomUUID()});
 for(const token of [h.tokens.worker,h.tokens.manager]){
  for(const action of ['externalRegister','externalReport','externalExport','externalEdit','externalCancel']){
   assert.throws(()=>h.call(token,action,{}),/autorizado/);
  }
 }
 const manager=h.call(h.tokens.manager,'overview',{});
 assert.equal(manager.consumption.externalMonth,0);
 assert.equal(manager.consumption.fleetMonths.length,0);
 assert.equal(manager.consumption.dailyEstimates.length,0);
 assert.equal(h.call(h.tokens.admin,'overview',{}).consumption.externalMonth,123);
 // Another administrator must not inherit the account-specific permission.
 h.state.properties.EXTERNAL_USER_ID='another-account';
 assert.throws(()=>h.call(h.tokens.admin,'externalReport',{}),/autorizado/);
});

test('responsible retains fuel, receipts and reports while collaborator only registers withdrawals',()=>{
 const h=harness();
 h.move(h.tokens.manager,{kind:'ENTRADA',litres:100,price:2,supplier:'Fornecedor',deliveryDate:'2026-01-01'});
 h.move(h.tokens.manager,{litres:5});
 assert.ok(h.call(h.tokens.manager,'report',{}));
 assert.ok(h.call(h.tokens.manager,'overview',{}));
 assert.throws(()=>h.move(h.tokens.manager,{kind:'ACERTO',measured:100,expectedStock:100,reason:'Teste'}),/autorizado/);
 for(const action of ['overview','report','export','adminData','save','vehicleLookup']){
  assert.throws(()=>h.call(h.tokens.worker,action,{}),/autorizado/);
 }
 h.move(h.tokens.worker,{litres:1});
});
