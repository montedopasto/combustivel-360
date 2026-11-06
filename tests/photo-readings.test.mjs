import test from 'node:test';import assert from 'node:assert/strict';
import {plateCandidates,litreCandidates} from '../frontend/photo-readings.js';
const vehicles=[{id:'a',plate:'AA-12-BB'},{id:'b',plate:'12-CD-34'}];
test('photo plate selection permits uncatalogued plates and exposes ambiguity',()=>{assert.deepEqual(plateCandidates('P\nAA 12 BB',vehicles),[vehicles[0]]);assert.deepEqual(plateCandidates('AA-12-BB\n12 CD 34',vehicles),vehicles);assert.deepEqual(plateCandidates('ZZ 99 ZZ',vehicles),[{plate:'ZZ99ZZ'}]);assert.deepEqual(plateCandidates('AA12B8',vehicles),[{plate:'AA12B8'}]);assert.deepEqual(plateCandidates('AA12BB',[]),[{plate:'AA12BB'}]);});
test('counter parses Portuguese decimals, whole litres and explicit thousands without guessing ambiguous separators',()=>{for(const [text,expected] of [['123,45 L',[123.45]],['123.45',[123.45]],['85 L',[85]],['1.234,50 L',[1234.5]],['1 234,50',[1234.5]],['1.234',[]],['1,234',[]],['0',[]],['-12,50',[]],['12 34',[]],['10000001',[]],['Litros 123,45\nPreço 1,70',[123.45,1.7]],['123,45\n123,45',[123.45]],['Sem leitura',[]]])assert.deepEqual(litreCandidates(text),expected,text);});

test('receipt suggestions normalize punctuation and reject invalid or future dates', async () => {
  const {guideSuggestions} = await import('../frontend/photo-readings.js');
  assert.deepEqual(guideSuggestions(['20.26/11.5', '2026/11/5', '2026/17/5', '2026/12/5'], 'date', '2026-11-06'), ['2026-11-05']);
  assert.deepEqual(guideSuggestions(['AR.72.02', 'AR-72-02', '103809'], 'plate'), ['AR-72-02']);
});
