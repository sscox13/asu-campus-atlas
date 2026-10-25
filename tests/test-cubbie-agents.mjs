import assert from 'node:assert/strict';
import fs from 'node:fs';
import {start,evaluate,merge,review,confirm,finalize} from '../skills/meet-me-halfway/scripts/agent.mjs';
const root=new URL('../skills/meet-me-halfway/assets/',import.meta.url),load=name=>JSON.parse(fs.readFileSync(new URL(name,root))),settings=load('session.json'),profiles=load('profiles.json');
const request=start(settings),ballots=profiles.map(p=>evaluate(request,p)),agreement=merge(request,ballots);
assert.equal(agreement.type,'agreement');assert.equal(agreement.plan.start,885);assert.equal(agreement.plan.venue,'noble');assert(profiles.every(p=>review(request,p,agreement).feasible));
for(const b of ballots){assert.deepEqual(Object.keys(b).sort(),['accepted','rejections','requestHash','session','student','type','version']);assert(!JSON.stringify(b).includes('origin'));assert(!JSON.stringify(b).includes('freeStart'));}
assert.throws(()=>merge(request,[ballots[0],ballots[0],ballots[2]]));assert.throws(()=>merge(start(settings),ballots));
assert.equal(merge(request,profiles.map(p=>evaluate(request,{...p,maxWalk:0}))).type,'no_agreement');
const yes=profiles.map(p=>confirm(agreement,p.id,'yes'));assert.equal(finalize(agreement,yes).type,'confirmed_plan');assert.throws(()=>finalize(agreement,yes.slice(0,2)));
assert.throws(()=>finalize(agreement,[yes[0],yes[1],confirm(agreement,'maya','no')]));
const changed=structuredClone(agreement);changed.venueName='Changed venue text';assert.throws(()=>finalize(changed,yes));
assert.throws(()=>review(request,profiles[0],{...agreement,date:'2026-10-27'}));
assert.equal(review(request,{...profiles[0],maxWalk:0},agreement).feasible,false);
const edited=structuredClone(request);edited.proposals[0].start++;assert.throws(()=>evaluate(edited,profiles[0]));
console.log('PASS: real campus packet exchange, 3 independent private profiles, request integrity, duplicate and stale ballot rejection, local re-review, no-agreement, all-student consent and changed-agreement rejection.');
