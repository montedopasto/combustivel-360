import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPlate} from '../frontend/plate-format.js';
import {harness} from './harness.mjs';
test('six-character plates receive separators consistently in the client and server',()=>{
 const h=harness();
 for(const [value,expected] of [['67VB39','67-VB-39'],['67-vb-39','67-VB-39'],[' 67 vb 39 ','67-VB-39'],['AA00BB','AA-00-BB'],['1234AA','12-34-AA'],['67VB','67VB']]){
  assert.equal(formatPlate(value),expected);
  assert.equal(h.ctx.plate_(value),expected);
 }
});
