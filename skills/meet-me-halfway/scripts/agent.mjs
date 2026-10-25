import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createWalkingRouter} from './route-core.mjs';
const root=new URL('../',import.meta.url),read=file=>{const text=fs.readFileSync(file,'utf8');if(text.length>512000)throw Error('Packet is too large.');return JSON.parse(text);};
const places=read(new URL('data/places.json',root)),graph=read(new URL('data/walking-graph.json',root)),router=createWalkingRouter(graph),cache=new Map();
const venue=id=>({hayden:{id:'hayden',name:'Hayden Library',index:43,quiet:true},noble:{id:'noble',name:'Noble Science and Engineering Library',index:121,quiet:true},union:{id:'union',name:'Memorial Union',index:42,quiet:false}})[id];
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`:JSON.stringify(value);
const hash=value=>crypto.createHash('sha256').update(stable(value)).digest('hex');
const validId=id=>typeof id==='string'&&/^[a-z0-9_-]{1,32}$/.test(id);
const planId=(request,plan)=>hash([request.session,request.date,request.participants,plan.start,plan.end,plan.venue]).slice(0,20);
function checkRequest(r){
 assert(r?.type==='request'&&r.version===1&&r.timezone==='America/Phoenix'&&typeof r.session==='string'&&r.session.length<=60,'Invalid session request.');
 assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&new Date(`${r.date}T12:00:00Z`).toISOString().slice(0,10)===r.date,'Invalid session date.');
 assert(Array.isArray(r.participants)&&r.participants.length>=2&&r.participants.length<=8&&r.participants.every(validId)&&new Set(r.participants).size===r.participants.length,'Use 2–8 distinct participant IDs.');
 assert(Array.isArray(r.proposals)&&r.proposals.length>0&&r.proposals.length<=180,'Invalid proposal list.');
 const seen=new Set();for(const p of r.proposals){assert(Number.isInteger(p.start)&&Number.isInteger(p.end)&&p.start>=0&&p.end<=1440&&p.end>p.start&&venue(p.venue)&&p.id===planId(r,p)&&!seen.has(p.id),'Invalid or changed proposal.');seen.add(p.id);}
 return r;
}
export function start(settings){
 assert(Number.isInteger(settings.earliest)&&Number.isInteger(settings.latest)&&settings.earliest>=0&&settings.latest<=1440&&settings.latest>settings.earliest,'Choose a valid daytime window in minutes after midnight.');
 assert(Number.isInteger(settings.duration)&&settings.duration>=15&&settings.duration<=180,'Duration must be 15–180 minutes.');
 const r={type:'request',version:1,session:crypto.randomUUID(),date:settings.date,timezone:'America/Phoenix',participants:settings.participants,proposals:[]};
 for(let t=Math.ceil(settings.earliest/15)*15;t+settings.duration<=settings.latest;t+=15)for(const v of ['hayden','noble','union']){const p={start:t,end:t+settings.duration,venue:v};p.id=planId(r,p);r.proposals.push(p);}
 return checkRequest(r);
}
function travel(a,b){if(a===b)return 0;const key=`${a}:${b}`;if(!cache.has(key))cache.set(key,Math.ceil(router(a,b).minutes));return cache.get(key);}
function checkProfile(p,r){assert(r.participants.includes(p.id),'This student is not on the session roster.');assert(Number.isInteger(p.freeStart)&&Number.isInteger(p.freeEnd)&&p.freeStart>=0&&p.freeEnd<=1440&&p.freeStart<p.freeEnd,'Check the student’s private availability.');assert([p.origin,p.next].every(i=>Number.isInteger(i)&&places[i]),'Choose mapped ASU buildings from places.');assert(Number.isInteger(p.maxWalk)&&p.maxWalk>=0&&p.maxWalk<=60&&typeof p.quiet==='boolean'&&venue(p.preferred),'Check walking limit, quiet requirement and preferred venue.');}
export function evaluate(r,p){
 checkRequest(r);checkProfile(p,r);const accepted=[],rejections={schedule:0,walk:0,venue:0,unmapped:0};
 for(const plan of r.proposals){const v=venue(plan.venue);let out,back;try{out=travel(p.origin,v.index);back=travel(v.index,p.next);}catch{rejections.unmapped++;continue;}
  if(plan.start<p.freeStart+out+3||plan.end>p.freeEnd-back-3){rejections.schedule++;continue;}
  if(Math.max(out,back)>p.maxWalk){rejections.walk++;continue;}
  if(p.quiet&&!v.quiet){rejections.venue++;continue;}
  accepted.push({plan:plan.id,out,back,preference:p.preferred===plan.venue?0:1});
 }
 return {type:'ballot',version:1,session:r.session,requestHash:hash(r),student:p.id,accepted,rejections};
}
export function merge(r,ballots){
 checkRequest(r);assert(Array.isArray(ballots)&&ballots.length===r.participants.length,'Need exactly one ballot per participant.');
 assert(new Set(ballots.map(b=>b.student)).size===r.participants.length,'Duplicate student ballot.');
 const known=new Set(r.proposals.map(p=>p.id));
 for(const b of ballots){assert(b.type==='ballot'&&b.session===r.session&&b.requestHash===hash(r)&&r.participants.includes(b.student),'Ballot is for another session, changed request or unknown student.');assert(Array.isArray(b.accepted)&&new Set(b.accepted.map(v=>v.plan)).size===b.accepted.length,'Invalid accepted proposal list.');for(const v of b.accepted)assert(known.has(v.plan)&&Number.isInteger(v.out)&&v.out>=0&&v.out<=60&&Number.isInteger(v.back)&&v.back>=0&&v.back<=60&&[0,1].includes(v.preference),'Invalid travel estimate or proposal in ballot.');}
 const options=[];for(const plan of r.proposals){const votes=ballots.map(b=>{const v=b.accepted.find(v=>v.plan===plan.id);return v?{student:b.student,out:v.out,back:v.back,preference:v.preference}:null;});if(votes.some(v=>!v))continue;
  options.push({plan,votes,score:[Math.max(...votes.map(v=>Math.max(v.out,v.back))),votes.reduce((n,v)=>n+v.out+v.back,0),votes.reduce((n,v)=>n+v.preference,0),plan.start]});}
 options.sort((a,b)=>{for(let i=0;i<a.score.length;i++)if(a.score[i]!==b.score[i])return a.score[i]-b.score[i];return a.plan.id.localeCompare(b.plan.id);});
 if(!options.length)return {type:'no_agreement',version:1,session:r.session,requestHash:hash(r),message:'No common feasible proposal. Ask students before changing constraints.'};
 return {type:'agreement',version:1,session:r.session,requestHash:hash(r),date:r.date,timezone:'America/Phoenix',participants:r.participants,plan:options[0].plan,venueName:venue(options[0].plan.venue).name,travel:options[0].votes.map(({student,out,back})=>({student,out,back})),needsStudentConfirmation:true};
}
function checkAgreement(a){assert(a?.type==='agreement'&&a.version===1&&Array.isArray(a.participants)&&a.participants.length>=2&&a.participants.every(validId)&&new Set(a.participants).size===a.participants.length&&a.timezone==='America/Phoenix'&&/^\d{4}-\d{2}-\d{2}$/.test(a.date)&&a.plan&&Number.isInteger(a.plan.start)&&Number.isInteger(a.plan.end)&&a.plan.start>=0&&a.plan.end<=1440&&a.plan.end>a.plan.start&&a.plan.id===planId(a,a.plan)&&venue(a.plan.venue)&&a.venueName===venue(a.plan.venue).name,'Invalid agreement.');}
export function review(r,p,a){checkRequest(r);checkAgreement(a);assert(a.requestHash===hash(r)&&a.session===r.session&&a.date===r.date&&stable(a.participants)===stable(r.participants),'Agreement does not match this request.');const vote=evaluate(r,p);const accepted=vote.accepted.find(v=>v.plan===a.plan.id);return {student:p.id,plan:a.plan.id,agreementHash:hash(a),feasible:!!accepted,...(accepted?{out:accepted.out,back:accepted.back}:{reason:'This no longer fits the student’s current constraints.'}),requiresStudentYes:true};}
export function confirm(a,student,decision){checkAgreement(a);assert(a.participants.includes(student)&&['yes','no'].includes(decision),'Unknown student or confirmation decision.');return {type:'confirmation',version:1,session:a.session,student,agreementHash:hash(a),decision};}
export function finalize(a,confirmations){
 checkAgreement(a);assert(Array.isArray(confirmations)&&confirmations.length===a.participants.length&&new Set(confirmations.map(c=>c.student)).size===a.participants.length,'Need one current confirmation from every student.');
 for(const c of confirmations)assert(c.type==='confirmation'&&c.version===1&&a.participants.includes(c.student)&&c.session===a.session&&c.agreementHash===hash(a)&&c.decision==='yes','Missing, declined, changed, or stale student approval.');
 return {type:'confirmed_plan',version:1,agreementHash:hash(a),date:a.date,start:a.plan.start,end:a.plan.end,venue:venue(a.plan.venue).name,participants:a.participants,roomBooked:false};
}
export function sample(){const r=start(read(new URL('assets/session.json',root))),profiles=read(new URL('assets/profiles.json',root)),ballots=profiles.map(p=>evaluate(r,p)),agreement=merge(r,ballots);return {sample:true,result:agreement,sharedBallotFields:Object.keys(ballots[0]),privateProfileShared:false,studentConfirmationsCollected:false};}
function flags(args){const result={};for(let i=0;i<args.length;i++){assert(args[i].startsWith('--'),'Use named arguments.');result[args[i].slice(2)]=args[i+1]&&!args[i+1].startsWith('--')?args[++i]:true;}return result;}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{const [command,...args]=process.argv.slice(2),f=flags(args);let result;
  const load=key=>{assert(typeof f[key]==='string',`Missing --${key} file.`);return read(f[key]);};
  if(f.sample||command==='sample'||command==='--sample')result=sample();
  else if(command==='places')result=places.filter(p=>!f.search||p.name.toLowerCase().includes(String(f.search).toLowerCase()));
  else if(command==='start')result=start(load('settings'));
  else if(command==='evaluate')result=evaluate(load('request'),load('profile'));
  else if(command==='merge')result=merge(load('request'),load('ballots'));
  else if(command==='review')result=review(load('request'),load('profile'),load('agreement'));
  else if(command==='confirm')result=confirm(load('agreement'),f.student,f.decision);
  else if(command==='finalize')result=finalize(load('agreement'),load('confirmations'));
  else throw Error('Use sample, places --search, start --settings, evaluate --request --profile, merge --request --ballots, review --request --profile --agreement, confirm --agreement --student --decision, or finalize --agreement --confirmations. Add --output file to save.');
  if(f.output){assert(typeof f.output==='string','Use --output file.');fs.writeFileSync(f.output,JSON.stringify(result),{mode:0o600});console.log(JSON.stringify({saved:f.output,type:result.type||'sample'}));}else console.log(JSON.stringify(result));
 }catch(error){console.error(`Meet Me Halfway: ${error.message}`);process.exitCode=1;}
}
