// Independent student agents communicate with a coordinator through explicit packets.
export const timeText=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
export class StudentAgent {
  #profile;#walk;#buffer;
  constructor(profile,walk,buffer=3){this.id=profile.id;this.name=profile.name;this.#profile=structuredClone(profile);this.#walk=walk;this.#buffer=buffer;}
  offer(){return {type:'availability',student:this.id,window:[this.#profile.freeStart,this.#profile.freeEnd]};}
  evaluate(plan){
    const p=this.#profile;let walk;
    try{walk={out:this.#walk(p.origin,plan.venue.index),back:this.#walk(plan.venue.index,p.next)};}catch{return {type:'ballot',student:this.id,plan:plan.id,accept:false,reason:'No connected walking route is mapped.'};}
    const outbound=Math.ceil(walk.out.minutes),inbound=Math.ceil(walk.back.minutes);
    if(plan.start<p.freeStart+outbound+this.#buffer||plan.end>p.freeEnd-inbound-this.#buffer)return {type:'ballot',student:this.id,plan:plan.id,accept:false,reason:'The session and travel do not fit my available window.'};
    if(Math.max(outbound,inbound)>p.maxWalk)return {type:'ballot',student:this.id,plan:plan.id,accept:false,reason:'The walk exceeds my student’s limit.'};
    if(p.quiet&&!plan.venue.quiet)return {type:'ballot',student:this.id,plan:plan.id,accept:false,reason:'My student needs a quiet venue.'};
    return {type:'ballot',student:this.id,plan:plan.id,accept:true,walkingMinutes:outbound,returnMinutes:inbound,preferencePenalty:p.preferred!==plan.venue.id?1:0};
  }
}
export function negotiate(agents,venues,{duration=60,earliest=840,latest=1080,revision=1}={}){
  const transcript=[],offers=agents.map(agent=>agent.offer());
  for(const offer of offers)transcript.push({from:offer.student,to:'Coordinator',type:'availability',text:`Available ${timeText(offer.window[0])}–${timeText(offer.window[1])}. Travel still needs to be checked.`,packet:offer});
  const propose=(start,venue)=>({id:`r${revision}-${start}-${duration}-${venue.id}`,revision,start,end:start+duration,venue});
  const firstStart=Math.max(earliest,...offers.map(o=>o.window[0]));
  const initial=propose(firstStart,venues[0]);
  transcript.push({from:'Coordinator',to:'All agents',type:'proposal',text:`First proposal: ${timeText(initial.start)}–${timeText(initial.end)} at ${initial.venue.name}.`,packet:initial});
  for(const agent of agents){const vote=agent.evaluate(initial);transcript.push({from:agent.id,to:'Coordinator',type:'ballot',text:vote.accept?`This fits. Estimated walk: ${vote.walkingMinutes} min.`:`Counterproposal needed: ${vote.reason}`,packet:vote});}
  const candidates=[];
  for(let start=Math.ceil(firstStart/15)*15;start+duration<=latest;start+=15){
    for(const venue of venues){const plan=propose(start,venue),votes=agents.map(a=>a.evaluate(plan));if(votes.every(v=>v.accept)){
      // Minimize the longest individual walk before total walking and soft preferences.
      const longest=Math.max(...votes.map(v=>Math.max(v.walkingMinutes,v.returnMinutes))),total=votes.reduce((sum,v)=>sum+v.walkingMinutes+v.returnMinutes,0),preference=votes.reduce((sum,v)=>sum+v.preferencePenalty,0);
      candidates.push({...plan,votes,score:[longest,total,preference,start]});
    }}
  }
  candidates.sort((a,b)=>{for(let i=0;i<a.score.length;i++)if(a.score[i]!==b.score[i])return a.score[i]-b.score[i];return 0;});
  const selected=candidates[0]||null;
  if(!selected){transcript.push({from:'Coordinator',to:'All agents',type:'blocked',text:'No plan satisfies everyone’s current constraints. Ask students to change the duration, time window, or walking limit; no constraint has been relaxed.',packet:{type:'no_agreement',revision}});return {transcript,selected:null,alternatives:[]};}
  transcript.push({from:'Coordinator',to:'All agents',type:'proposal',text:`Revised proposal: ${timeText(selected.start)}–${timeText(selected.end)} at ${selected.venue.name}. Selected for the smallest worst-case walk, then total walking, venue preferences, and start time.`,packet:selected});
  for(const vote of selected.votes)transcript.push({from:vote.student,to:'Coordinator',type:'accept',text:`Feasible: ${vote.walkingMinutes} min there, ${vote.returnMinutes} min onward. Asking my student to confirm this exact plan.`,packet:vote});
  transcript.push({from:'Coordinator',to:'Students',type:'confirmation',text:'Agent agreement is not student consent. All three students must confirm before calendar export is enabled.',packet:{type:'confirmation_required',plan:selected.id}});
  return {transcript,selected,alternatives:candidates.filter(p=>p.id!==selected.id).slice(0,3)};
}
export class ConsentLedger {
  constructor(ids){this.ids=[...ids];this.reset(null);}
  reset(planId){this.planId=planId;this.confirmations=new Set();this.declined=false;}
  confirm(student,planId){if(!this.ids.includes(student)||planId!==this.planId||!planId||this.declined)throw new Error('Consent does not match the current proposal.');this.confirmations.add(student);}
  decline(student,planId){if(!this.ids.includes(student)||planId!==this.planId||!planId)throw new Error('Unknown proposal or student.');this.declined=true;this.confirmations.clear();}
  get complete(){return !!this.planId&&!this.declined&&this.ids.every(id=>this.confirmations.has(id));}
}
export function calendarFile(plan,date,ledger){
 if(!ledger.complete||ledger.planId!==plan.id)throw new Error('Everyone must confirm this exact plan before export.');
 const escape=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const stamp=minutes=>{const local=new Date(`${date}T${timeText(minutes)}:00-07:00`);if(!Number.isFinite(local.getTime()))throw new Error('Choose a valid date.');return local.toISOString().replace(/[-:]/g,'').replace('.000','');};
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Tempe Atlas//Campus Agents//EN','BEGIN:VEVENT',`UID:${date}-${plan.id}@tempe-atlas.demo`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace('.000','')}`,`DTSTART:${stamp(plan.start)}`,`DTEND:${stamp(plan.end)}`,`SUMMARY:${escape('Campus study session')}`,`LOCATION:${escape(plan.venue.name)}`,'DESCRIPTION:Student-approved plan. Room availability and venue hours are not verified.','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
