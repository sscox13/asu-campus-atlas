import assert from 'node:assert/strict';
import {StudentAgent,negotiate,ConsentLedger,calendarFile} from '../agents-core.mjs';
const profile=(id,extra={})=>({id,name:id,origin:0,next:2,freeStart:840,freeEnd:1020,maxWalk:15,quiet:true,preferred:'library',...extra});
const walk=(a,b)=>({minutes:a===b?0:8});
const agents=[new StudentAgent(profile('A'),walk),new StudentAgent(profile('B',{freeStart:870}),walk),new StudentAgent(profile('C'),walk)];
const venues=[{id:'library',name:'Library',index:1,quiet:true},{id:'cafe',name:'Cafe',index:3,quiet:false}];
const run=negotiate(agents,venues);assert(run.selected);assert.equal(run.selected.start,885);assert.equal(run.selected.venue.id,'library');assert(run.transcript.some(m=>m.packet.accept===false));
for(const m of run.transcript.filter(m=>m.type==='availability'||m.type==='ballot'||m.type==='accept')){assert(!JSON.stringify(m.packet).includes('origin'));assert(!JSON.stringify(m.packet).includes('next'));}
assert.equal(negotiate([new StudentAgent(profile('A',{freeEnd:860}),walk)],venues).selected,null);
assert.equal(negotiate([new StudentAgent(profile('A',{maxWalk:2}),walk)],venues).selected,null);
assert.equal(negotiate([new StudentAgent(profile('A'),()=>{throw Error('No route');})],venues).selected,null);
const ledger=new ConsentLedger(['A','B','C']);ledger.reset(run.selected.id);assert.throws(()=>calendarFile(run.selected,'2026-10-26',ledger));
ledger.confirm('A',run.selected.id);ledger.confirm('B',run.selected.id);assert(!ledger.complete);ledger.confirm('C',run.selected.id);assert(ledger.complete);assert(calendarFile(run.selected,'2026-10-26',ledger).includes('DTSTART:20261026T214500Z'));
ledger.reset('new-plan');assert(!ledger.complete);assert.throws(()=>ledger.confirm('A',run.selected.id));ledger.decline('C','new-plan');assert.throws(()=>ledger.confirm('A','new-plan'));
console.log('PASS: conflict negotiation, travel, quiet venue, impossible constraints, missing routes, packet minimization, unanimous consent, decline, stale consent and Phoenix calendar times.');
