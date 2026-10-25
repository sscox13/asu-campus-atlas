import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWalkingRouter} from '../route-core.mjs';
import {StudentAgent,negotiate} from '../agents-core.mjs';
const load=name=>JSON.parse(fs.readFileSync(new URL(`../${name}`,import.meta.url)));
const buildings=load('campus-buildings.json'),features=load('model-info.json').features,graph=load('walking-graph.json'),skillPlaces=load('skills/meet-me-halfway/data/places.json');
assert(buildings.length>=70);assert.equal(new Set(buildings.map(b=>b.index)).size,buildings.length);assert.equal(new Set(buildings.map(b=>b.name)).size,buildings.length);assert.equal(new Set(buildings.map(b=>b.group)).size,6);
assert.deepEqual(buildings,load('skills/meet-me-halfway/data/campus-buildings.json'));
for(const required of ['Grady Gammage Memorial Auditorium','Sun Devil Fitness Complex','Biodesign Institute Building A','Mountain America Stadium','McCord Hall','Lattie F. Coor Hall','Manzanita Hall','Interdisciplinary Science and Technology Building (ISTB) 4'])assert(buildings.some(b=>b.name===required),`Missing major building: ${required}`);
const router=createWalkingRouter(graph),walk=(a,b)=>a===b?{minutes:0,meters:0}:router(a,b),index=name=>features.findIndex(f=>f.name===name);
const venues=[{id:'hayden',name:'Hayden Library',index:index('Hayden Library'),quiet:true},{id:'noble',name:'Noble Science and Engineering Library',index:index('Noble Science and Engineering Library'),quiet:true},{id:'union',name:'Memorial Union',index:index('Memorial Union'),quiet:false}];
let count=0;
for(const building of buildings){assert.equal(features[building.index].name,building.name);assert.equal(skillPlaces[building.index].name,building.name);assert(graph.access[building.index],`Missing access: ${building.name}`);
 for(const venue of venues)for(const [from,to] of [[building.index,venue.index],[venue.index,building.index]]){const route=walk(from,to);assert(Number.isFinite(route.minutes)&&route.minutes>=0);assert(Number.isFinite(route.meters)&&route.meters>=0);if(from!==to){assert(route.points.length>=2);count++;}}
}
const origins=['Grady Gammage Memorial Auditorium','Sun Devil Fitness Complex','Biodesign Institute Building A'];
const profiles=origins.map((name,i)=>({id:`student${i}`,name:`Student ${i}`,origin:index(name),next:index(['McCord Hall','Mountain America Stadium','Manzanita Hall'][i]),freeStart:840,freeEnd:1080,maxWalk:30,quiet:true,preferred:'hayden'}));
const result=negotiate(profiles.map(p=>new StudentAgent(p,walk)),venues);assert(result.selected,'Expanded building scenario should reach agreement');
for(const vote of result.selected.votes){const profile=profiles.find(p=>p.id===vote.student);assert.equal(vote.walkingMinutes,Math.ceil(walk(profile.origin,result.selected.venue.index).minutes));assert.equal(vote.returnMinutes,Math.ceil(walk(result.selected.venue.index,profile.next).minutes));}
console.log(`PASS: ${buildings.length} unique major buildings, 6 groups, ${count} mapped walking routes, Cubbie catalog consistency and negotiation using new origins/next destinations.`);
