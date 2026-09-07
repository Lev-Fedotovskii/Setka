import test from 'node:test';
import assert from 'node:assert/strict';
import {sortSources,selectedUpdate} from '../src/sources.js';
import {reviewRecords,validateSelection} from '../src/import/review.js';
test('new review includes alternatives and old exclusions without modifying personal state',()=>{
 const candidate={series:[{id:'a',needsChoice:true,cohorts:[{groupId:'G'}],source:{fingerprint:'a'}},{id:'b',blocked:true,cohorts:[{groupId:'G'}],source:{fingerprint:'b'}}],importMeta:{}};
 const state={groupId:'G',schedule:{series:[],importMeta:{excluded:['a']}},tasks:[{id:'personal'}],sessions:[{id:'session'}]};const before=structuredClone(state);
 assert.deepEqual(reviewRecords(candidate,'G').map(s=>s.id),['a','b']);assert.deepEqual(selectedUpdate(candidate,state).series.map(s=>s.id),['a']);
 assert.throws(()=>validateSelection(candidate,new Set(['a','b']),[]),/Уточните/);
 assert.throws(()=>validateSelection(candidate,new Set(['a']),['missing-time']),/Уточните/);
 assert.doesNotThrow(()=>validateSelection(candidate,new Set(['a']),[]));assert.deepEqual(state,before);
});
test('catalog sorts numeric course metadata independent of filenames and input order',()=>{
 const sources=[{id:'c',course:10,filename:'1.xlsx'},{id:'b',course:2,filename:'aaa.xlsx'},{id:'a',course:1,filename:'zzz.xls'},{id:'d',label:'Unknown'}];
 assert.deepEqual(sortSources(sources).map(s=>s.id),['a','b','c','d']);assert.deepEqual(sortSources([...sources].reverse()).map(s=>s.id),['a','b','c','d']);assert.equal(sources[0].id,'c');
});
