import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendationWindows,visibleRecommendationWindows} from '../src/domain/recommendation-windows.js';
import {freeWindows,planSession} from '../src/domain/planner.js';
import {newState} from '../src/storage.js';
test('minimum and dated/weekly exclusions affect recommendations, not availability or manual planning',()=>{
  const s=newState('2026-09-08');s.settings={dayStart:540,dayEnd:1260,minimumWindow:30,recommendationExclusions:[{id:'lunch',weekday:2,start:720,end:780},{id:'once',date:'2026-09-08',start:800,end:820}]};
  assert.deepEqual(recommendationWindows({start:700,end:850},'2026-09-08',s.settings),[{start:820,end:850}]);
  assert.deepEqual(recommendationWindows({start:700,end:850},'2026-09-15',s.settings),[{start:780,end:850}]);
  assert.deepEqual(freeWindows([],700,850),[{start:700,end:850}]);
  s.tasks=[{id:'t',title:'Choice',status:'todo',remainingMinutes:30,splittable:true}];
  planSession(s,'t','2026-09-08',730,30,{date:'2026-09-08',minute:600});assert.equal(s.sessions[0].start,730);
});
test('timeline hides any window without an eligible recommendation interval, including minimum boundaries',()=>{
  const windows=[{start:600,end:610},{start:620,end:640},{start:650,end:680},{start:700,end:760}];
  assert.deepEqual(visibleRecommendationWindows(windows,'2026-09-10',{minimumWindow:20}),windows.slice(1));
  assert.deepEqual(visibleRecommendationWindows(windows,'2026-09-10',{minimumWindow:30}),windows.slice(2));
  assert.deepEqual(visibleRecommendationWindows(windows,'2026-09-10',{minimumWindow:60,recommendationExclusions:[{date:'2026-09-10',start:700,end:730}]}),[]);
  assert.deepEqual(visibleRecommendationWindows(windows,'2026-09-10',{minimumWindow:10}),windows);
  assert.equal(windows.length,4,'Presentation must not erase availability');
});
