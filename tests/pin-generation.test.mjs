import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './harness.mjs';
test('admin generates an unused four-number PIN including inactive accounts',()=>{
 const h=harness();
 for(const token of [h.tokens.worker,h.tokens.manager])assert.throws(()=>h.call(token,'generatePin'),/autorizado/);
 const result=h.call(h.tokens.admin,'generatePin');
 assert.match(result.pin,/^[0-9]{4}$/);
 const index=h.ctx.indexPin_(result.pin);
 assert.ok(h.ctx.rows_('UTILIZADORES').every(user=>user.pin.index!==index));
});
test('new PINs require four numbers and existing PINs can remain unchanged',()=>{
 const h=harness();
 const user=h.ctx.rows_('UTILIZADORES').find(user=>user.id==='colaborador');
 for(const pin of ['123','12345','123456'])assert.throws(()=>h.call(h.tokens.admin,'save',{entity:'user',data:{id:user.id,name:user.name,role:user.role,active:true,pin}}),/4 números/);
 h.call(h.tokens.admin,'save',{entity:'user',data:{id:user.id,name:user.name,role:user.role,active:true}});
 assert.equal(h.ctx.rows_('UTILIZADORES').find(row=>row.id===user.id).pin.hash,user.pin.hash);
});
