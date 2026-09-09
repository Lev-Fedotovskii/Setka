import test from 'node:test';
import assert from 'node:assert/strict';
import {newState} from '../src/storage.js';
import {statusPlan} from '../src/domain/status-plan.js';
test('status plan uses actual Moscow date, useful transitions, quiet hours and finite expiry',()=>{
  const s=newState('2026-09-08');s.events=[{id:'e',title:'Личное',date:'2026-09-08',start:600,end:660}];
  const p=statusPlan(s,Date.parse('2026-09-08T06:00:00Z'),1);
  assert.equal(p.entries.find(e=>e.at===Date.parse('2026-09-08T07:00:00Z')).title,'Личное');
  assert.equal(p.entries.find(e=>e.at===Date.parse('2026-09-08T08:00:00Z')).show,false);
  assert.equal(p.expiresAt,Date.parse('2026-09-08T21:00:00Z'));
  s.notifications.quietStart=590;s.notifications.quietEnd=700;assert.equal(statusPlan(s,Date.parse('2026-09-08T06:00:00Z'),1).entries.find(e=>e.at===Date.parse('2026-09-08T07:00:00Z')).show,false);
});
