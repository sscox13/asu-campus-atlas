import {createWalkingRouter} from './route-core.mjs';
import {StudentAgent,negotiate,ConsentLedger,calendarFile,timeText} from './agents-core.mjs';
const $=id=>document.getElementById(id),ids=['ava','ben','maya'],names={ava:'Ava’s agent',ben:'Ben’s agent',maya:'Maya’s agent',Coordinator:'Coordinator',Students:'Students'};
let profiles=[],venues=[],features=[],campusBuildings=[],walk,run=null,revision=0;const ledger=new ConsentLedger(ids);
const date=new Date(),phoenixDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);$('session-date').value=phoenixDate;
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const minutes=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
const inputIds=['session-date','duration','scenario'];
function invalidate(){revision++;run=null;ledger.reset(null);$('calendar').hidden=true;$('consent').replaceChildren();$('proposal').replaceChildren(make('h2','', 'Ready for a fresh plan.'),make('p','','Changes clear all previous approvals. Run negotiation again.'));$('messages').replaceChildren(make('div','empty','Constraints updated. Previous proposals and confirmations are no longer valid.'));$('run-state').textContent='READY';}
function renderStudents(){
 $('students').replaceChildren();
 for(const p of profiles){
  const card=make('article','student');card.style.setProperty('--accent',p.accent);
  const heading=make('div','student-heading');heading.append(make('span','avatar',p.name[0]));const title=make('div');title.append(make('h3','',`${p.name} + personal agent`),make('small','','LOCAL PROFILE · SAMPLE DATA'));heading.append(title);card.append(heading);
  const fields=make('div','student-fields');
  function field(label,key,type,options,wide=false){const wrap=make('div',wide?'wide':'');const id=`${p.id}-${key}`,labelElement=make('label','',label);labelElement.htmlFor=id;wrap.append(labelElement);let control;
   if(options){control=make('select');const groups=new Map();for(const [value,text,group] of options){const option=make('option','',text);option.value=value;if(group){if(!groups.has(group)){const optgroup=make('optgroup');optgroup.label=group;groups.set(group,optgroup);control.append(optgroup);}groups.get(group).append(option);}else control.append(option);}}
   else{control=make('input');control.type=type;if(type==='time')control.step='900';if(type==='number'){control.min='0';control.max='60';}}
   control.id=id;control.value=type==='time'?timeText(p[key]):p[key];control.addEventListener(type==='number'||type==='time'?'input':'change',()=>{p[key]=type==='time'?minutes(control.value):['maxWalk','origin','next'].includes(key)?Number(control.value):control.value;invalidate();});wrap.append(control);fields.append(wrap);
  }
  field('FREE AFTER','freeStart','time');field('MUST BE BACK BY','freeEnd','time');
  const locations=campusBuildings.map(f=>[f.index,f.name,f.group]);
  field('LEAVING FROM · NOT SHARED','origin','select',locations,true);field('NEXT DESTINATION · NOT SHARED','next','select',locations,true);
  field('MAX WALK · MINUTES','maxWalk','number');field('PREFERRED VENUE','preferred','select',venues.map(v=>[v.id,v.short]));
  const quiet=make('label','quiet wide');const checkbox=make('input');checkbox.type='checkbox';checkbox.checked=p.quiet;checkbox.id=`${p.id}-quiet`;checkbox.addEventListener('change',()=>{p.quiet=checkbox.checked;invalidate();});quiet.append(checkbox,document.createTextNode('Quiet venue is a hard requirement'));fields.append(quiet);card.append(fields);
  card.append(make('p','privacy','Shares availability and proposal ballots. Keeps class locations and reasons out of the coordination channel.'));
  const copy=make('button','copy-prompt','Copy prompt for my personal AI ↗');copy.type='button';copy.onclick=async()=>{const selected=run?.selected;const payload={student:p.name,privateContext:{freeStart:timeText(p.freeStart),freeEnd:timeText(p.freeEnd),origin:features[p.origin].name,next:features[p.next].name,maxWalkMinutes:p.maxWalk,quiet:p.quiet},proposal:selected?{id:selected.id,venue:selected.venue.name,start:timeText(selected.start),end:timeText(selected.end),date:$('session-date').value,walkingEstimate:selected.votes.find(v=>v.student===p.id)}:null};
   const prompt=`You are my personal campus agent. Help coordinate an ASU Tempe study session. This is sample/demo context; do not treat it as my actual calendar. Keep my locations and private schedule reasons out of any reply meant for the group. Evaluate the proposal against my availability, mapped walking estimates and quiet requirement. If anything does not fit, counterpropose rather than silently relaxing a constraint. Ask me before I share a reply, confirm attendance, send an invite, or book anything. Do not claim venue hours or room availability are verified. If there is no proposal, help me state a useful availability offer.\n\n${JSON.stringify(payload,null,2)}`;
   try{await navigator.clipboard.writeText(prompt);copy.textContent='Copied — paste into your own AI chat';}catch{const dialog=make('dialog');const text=make('textarea');text.value=prompt;text.style.cssText='width:80vw;height:50vh';const close=make('button','','Close');close.onclick=()=>dialog.remove();dialog.append(text,close);document.body.append(dialog);dialog.showModal();text.select();}
  };card.append(copy);$('students').append(card);
 }
}
function addMessage(message){const item=make('article','message');item.dataset.from=message.from==='Coordinator'?'Coordinator':message.from;const sender=make('div','sender');sender.append(make('span','',names[message.from]||message.from),make('span','',`→ ${names[message.to]||message.to}`));item.append(sender,make('p','',message.text));const details=make('details');details.append(make('summary','','Inspect exchanged packet'),make('pre','',JSON.stringify(message.packet,null,2)));item.append(details);$('messages').append(item);}
function renderConsent(){
 $('consent').replaceChildren();$('calendar').hidden=!run?.selected;$('calendar').disabled=!ledger.complete;
 if(!run?.selected)return;
 for(const p of profiles){const row=make('div','consent-row');row.append(make('span','',p.name));
  if(ledger.declined)row.append(make('span','approved','Plan declined'));
  else if(ledger.confirmations.has(p.id))row.append(make('span','approved','✓ Student confirmed'));
  else{const buttons=make('div');const confirm=make('button','',`Confirm as ${p.name}`),decline=make('button','decline','Decline');
   confirm.onclick=()=>{ledger.confirm(p.id,run.selected.id);addMessage({from:'Students',to:'Coordinator',text:`${p.name} confirmed proposal ${run.selected.id}.`,packet:{type:'student_confirmation',student:p.id,plan:run.selected.id}});renderConsent();$('run-state').textContent=ledger.complete?'APPROVED':'AWAITING STUDENTS';};
   decline.onclick=()=>{ledger.decline(p.id,run.selected.id);addMessage({from:'Students',to:'Coordinator',text:`${p.name} declined. Calendar export is blocked. Change the constraints and negotiate a new plan.`,packet:{type:'student_decline',student:p.id,plan:run.selected.id}});renderConsent();$('run-state').textContent='DECLINED';};buttons.append(confirm,decline);row.append(buttons);}
  $('consent').append(row);
 }
}
function renderOutcome(){const plan=run.selected;$('proposal').replaceChildren();if(!plan){$('proposal').append(make('h2','','No forced compromises.'),make('p','','No plan meets every hard constraint. Ask students before changing their availability or walking limit. Try 45 minutes, or edit the profiles and negotiate again.'));$('run-state').textContent='NO AGREEMENT';renderConsent();return;}
 $('proposal').append(make('p','plan-place',plan.venue.name),make('strong','plan-time',`${timeText(plan.start)}–${timeText(plan.end)}`),make('div','plan-date',`${$('session-date').value} · America/Phoenix`),make('p','','Agents found a feasible plan. Students still decide.'));
 const walks=make('div','walking');for(const vote of plan.votes){const col=make('div');col.append(make('span','',profiles.find(p=>p.id===vote.student).name),make('b','',`${vote.walkingMinutes} min`),make('small','',`${vote.returnMinutes} min onward`));walks.append(col);}$('proposal').append(walks);$('run-state').textContent='AWAITING STUDENTS';renderConsent();
}
$('negotiate').onclick=()=>{
 const valid=profiles.every(p=>Number.isFinite(p.freeStart)&&Number.isFinite(p.freeEnd)&&p.freeStart<p.freeEnd&&Number.isFinite(p.maxWalk)&&p.maxWalk>=0&&p.maxWalk<=60);
 if(!valid||!$('session-date').value){$('run-state').textContent='CHECK INPUTS';return;}
 revision++;const agents=profiles.map(p=>new StudentAgent(p,walk));run=negotiate(agents,venues,{duration:Number($('duration').value),revision});ledger.reset(run.selected?.id||null);$('messages').replaceChildren();run.transcript.forEach(addMessage);renderOutcome();
};
$('calendar').onclick=()=>{try{const content=calendarFile(run.selected,$('session-date').value,ledger),url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'})),a=make('a');a.href=url;a.download='campus-study-session.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){$('run-state').textContent=error.message;}};
$('scenario').onchange=()=>{profiles=defaults();if($('scenario').value==='impossible'){profiles[0].freeEnd=900;profiles[2].freeStart=960;}if($('scenario').value==='walk')profiles[2].maxWalk=0;invalidate();renderStudents();};
$('session-date').onchange=invalidate;$('duration').onchange=invalidate;
let defaults;
try{
 const [meta,graph,buildings]=await Promise.all([fetch('model-info.json').then(r=>r.json()),fetch('walking-graph.json').then(r=>r.json()),fetch('campus-buildings.json').then(r=>{if(!r.ok)throw Error('Campus building list unavailable');return r.json();})]);campusBuildings=buildings;features=meta.features.map((f,index)=>({...f,index}));const index=name=>{const f=features.find(f=>f.name===name);if(!f)throw Error('Missing campus building');return f.index;};
 venues=[{id:'hayden',name:'Hayden Library',short:'Hayden',index:index('Hayden Library'),quiet:true},{id:'noble',name:'Noble Science and Engineering Library',short:'Noble',index:index('Noble Science and Engineering Library'),quiet:true},{id:'union',name:'Memorial Union',short:'Memorial Union',index:index('Memorial Union'),quiet:false}];
 const router=createWalkingRouter(graph),cache=new Map();walk=(a,b)=>{if(a===b)return {minutes:0,meters:0};const key=`${a}:${b}`;if(!cache.has(key))cache.set(key,router(a,b));return cache.get(key);};
 defaults=()=>[{id:'ava',name:'Ava',accent:'#d6c093',freeStart:840,freeEnd:1020,origin:index('Wexler Hall'),next:index('Wexler Hall'),maxWalk:15,quiet:true,preferred:'hayden'},{id:'ben',name:'Ben',accent:'#a5c2ca',freeStart:855,freeEnd:990,origin:index('Engineering Center A-Wing'),next:index('Engineering Center A-Wing'),maxWalk:15,quiet:false,preferred:'noble'},{id:'maya',name:'Maya',accent:'#b6c89e',freeStart:870,freeEnd:1020,origin:index('Old Main'),next:index('Old Main'),maxWalk:12,quiet:false,preferred:'hayden'}];
 profiles=defaults();renderStudents();$('building-coverage').textContent=`${campusBuildings.length} major ASU buildings · Choose where you leave class and where you need to go next.`;$('negotiate').disabled=false;$('negotiate').textContent='Let the agents work ↗';
}catch(error){$('run-state').textContent='ROUTE DATA UNAVAILABLE';$('messages').replaceChildren(make('p','',`Could not load the campus walking graph: ${error.message}. Please refresh.`));}
