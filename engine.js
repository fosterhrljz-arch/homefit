(function(root){
 'use strict';
 const {exercises}=root.HomeFitData || require('./exercises.js');
 const byId=id=>exercises.find(e=>e.id===id);
 const levels={beginner:1,intermediate:2,advanced:3};
 const targets={full:['legs','chest','back','core','glutes','shoulders','arms','cardio'],upper:['chest','back','shoulders','arms'],lower:['legs','glutes'],core:['core'],legs:['legs'],glutes:['glutes'],chest:['chest'],back:['back'],shoulders:['shoulders'],arms:['arms']};
 const restrictions=['knees','back','shoulders','wrists','floor','impact'];
 const defaults=()=>({name:'',weight:70,unit:'kg',level:'beginner',goal:'fitness',minutes:25,equipment:['bodyweight'],weights:[5,10],limitations:[],notes:'',configured:false,bandLevels:['light'],bandTypes:[],assessment:null});
 const fresh=()=>({version:1,profile:defaults(),history:[],active:null,plan:null,revision:2,weeklyPrefs:{days:3,startDay:1}});
 const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
 function validateProfile(p){
   if(!p || typeof p!=='object') throw Error('The profile is missing.');
   if(typeof p.name!=='string'||p.name.length>40||typeof p.notes!=='string'||p.notes.length>500) throw Error('Check your name and notes.');
   if(!['kg','lb'].includes(p.unit)||!Number.isFinite(p.weight)||p.weight<(p.unit==='kg'?30:66)||p.weight>(p.unit==='kg'?300:660)) throw Error('Enter a weight between 30–300 kg or 66–660 lb.');
   if(!Object.hasOwn(levels,p.level)||!['fitness','strength','endurance'].includes(p.goal)||!Number.isInteger(p.minutes)||p.minutes<10||p.minutes>60) throw Error('Choose a valid level, goal, and 10–60 minutes.');
   if(!Array.isArray(p.equipment)||!p.equipment.includes('bodyweight')||p.equipment.some(e=>!['bodyweight','bands','dumbbells','mat'].includes(e))) throw Error('Choose valid equipment.');
   if(!Array.isArray(p.weights)||p.weights.length>20||p.weights.some(n=>!Number.isFinite(n)||n<=0||n>200)||(p.equipment.includes('dumbbells')&&!p.weights.length)) throw Error('Enter 1–20 dumbbell weights, each greater than 0 and no more than 200.');
   if(!Array.isArray(p.limitations)||p.limitations.some(l=>!restrictions.includes(l))) throw Error('Choose valid movement restrictions.');
   if(p.bandLevels!==undefined&&(!Array.isArray(p.bandLevels)||!p.bandLevels.length||p.bandLevels.some(v=>!bandLevels.includes(v))))throw Error('Choose at least one valid band resistance.');
   // Missing types are accepted in old backups, but never imply band ownership.
   if(p.bandTypes!==undefined&&(!Array.isArray(p.bandTypes)||new Set(p.bandTypes).size!==p.bandTypes.length||p.bandTypes.some(v=>!bandTypes.includes(v))))throw Error('Choose valid band types.');
   if(p.assessment)assess(p.assessment);
   return p;
 }

 const bandLevels=['light','medium','heavy'];
 const bandTypes=['long','mini'];
 const equipmentMatches=(p,e)=>p.equipment.includes(e.equipment)&&(e.equipment!=='bands'||(p.bandTypes||[]).includes(e.bandType));
 function pendingEquipment(active,p){
   if(!active||['review','cooldown'].includes(active.phase))return [];
   const index=active.phase==='warmup'?0:active.phase==='rest'?active.nextIndex:active.index;
   return active.plan.items.slice(index??active.index).map(i=>byId(i.id)).filter(e=>!equipmentMatches(p,e));
 }
 const ratingValues=['easy','right','hard','pain'];
 function assess(a){
   if(!a||!['none','some','regular'].includes(a.activity)||!['support','comfortable','confident'].includes(a.movement)||!['low','okay','good'].includes(a.recovery))throw Error('Complete all three assessment questions.');
   const score=['none','some','regular'].indexOf(a.activity)+['support','comfortable','confident'].indexOf(a.movement)+['low','okay','good'].indexOf(a.recovery);
   const gentle=a.movement==='support'||a.recovery==='low'||score<=2;
   return {score,tier:gentle?'gentle':score>=5?'ready':'steady',label:gentle?'A gentle start':score>=5?'Ready for consistency':'Build your foundation',text:gentle?'Beginner movements, one set to start, and extra recovery. Your selected experience level is never increased.':score>=5?'Start within your selected experience level. Progress only when your exercise check-ins support it.':'Moderate starting volume, controlled repetitions, and regular recovery days.'};
 }
 const effectiveLevel=p=>p.assessment&&assess(p.assessment).tier==='gentle'?1:levels[p.level];
 const realHistory=history=>history.filter(h=>!h.sample).slice().sort((a,b)=>b.date.localeCompare(a.date));
 function painStatus(history){
   const excluded=new Set();let general=false;
   for(const h of realHistory(history)){
     if(h.painResolvedAt)continue;
     const ids=[...(h.painExercises||[]),...Object.entries(h.exerciseFeedback||{}).filter(([,v])=>v==='pain').map(([id])=>id),...h.logs.filter(l=>l.feedback==='pain').map(l=>l.id)];
     ids.forEach(id=>excluded.add(id));
     if(h.generalPain||(h.feedback==='pain'&&!ids.length))general=true;
   }
   return {excluded:[...excluded],general};
 }
 function feedback(history,target='full'){
   const pain=painStatus(history),recent=realHistory(history).filter(h=>h.logs.length||h.feedback==='pain'),relevant=recent.filter(h=>h.target===target||h.target==='full').slice(0,2);
   if(pain.general)return {mode:'caution',needsReview:true,text:'Unresolved general discomfort needs a review before a new plan. Open the affected session in Progress; resume only after the cause is addressed.',excluded:pain.excluded};
   if(pain.excluded.length)return {mode:'caution',text:'Only the movements flagged for pain are excluded. Other compatible exercises use conservative volume. Review unresolved pain in Progress.',excluded:pain.excluded};
   if(relevant[0]&&(['hard','pain'].includes(relevant[0].feedback)||relevant[0].completion<0.6))return {mode:'ease',text:'A lighter session with extra recovery. Each exercise also considers its own recent check-ins.',excluded:[]};
   return {mode:'steady',text:'Your plan learns exercise by exercise. Two comfortable completed visits to a movement can add a small challenge; difficult movements get less volume.',excluded:[]};
 }
 function exerciseAdvice(id,history){
   const visits=realHistory(history).filter(h=>h.logs.some(l=>l.id===id)).slice(0,2).map(h=>{
     const logs=h.logs.filter(l=>l.id===id),ratings=logs.map(l=>l.feedback).filter(Boolean);
     const rating=h.exerciseFeedback?.[id]||(ratings.includes('pain')?'pain':ratings.includes('hard')?'hard':ratings.length&&ratings.every(v=>v==='easy')?'easy':ratings.length?'right':h.feedback);
     const last=logs.at(-1);return {rating,completion:h.completion,reps:Math.min(...logs.map(l=>l.reps)),load:last.load,unit:last.unit,band:last.band||'light'};
   });
   if(!visits.length)return {mode:'steady',text:'Start comfortably; leave two or three controlled reps in reserve.'};
   if(['hard','pain'].includes(visits[0].rating))return {mode:'ease',text:'This movement felt difficult. Use one set, fewer reps, and more rest.'};
   if(visits.length===2&&visits.every(v=>v.rating==='easy'&&v.completion>=0.9)&&visits[0].load===visits[1].load&&visits[0].unit===visits[1].unit&&visits[0].band===visits[1].band)return {mode:'progress',reps:Math.min(...visits.map(v=>v.reps)),band:visits[0].band,load:visits[0].load,unit:visits[0].unit,text:'Two comfortable visits at the same resistance. Try a small rep increase; resistance stays under your control.'};
   return {...visits[0],mode:'steady',text:'Keep this movement steady and check in after your sets.'};
 }
 function eligible(p,history=[],target='full'){
   if(!Object.hasOwn(targets,target))return [];
   const pain=painStatus(history);
   return exercises.filter(e=>targets[target].includes(e.muscle)&&equipmentMatches(p,e)&&e.level<=effectiveLevel(p)&&!e.avoid.some(l=>p.limitations.includes(l))&&!pain.excluded.includes(e.id));
 }
 const availableTargets=(p,history=[])=>feedback(history).needsReview?[]:Object.keys(targets).filter(t=>eligible(p,history,t).length);
 // Modular contribution; planSeconds removes the final rest and transition.
 const duration=item=>item.sets*((byId(item.id).timed?item.reps:item.reps*4)+item.rest)+20;
 const planSeconds=p=>p.warmup+p.cooldown+p.items.reduce((n,i)=>n+duration(i),0)-(p.items.length?p.items.at(-1).rest+20:0);
 function prescribe(e,p,history,adaptation){
   const advice=exerciseAdvice(e.id,history),gentle=p.assessment&&assess(p.assessment).tier==='gentle';
   const ease=gentle||['ease','caution'].includes(adaptation.mode)||advice.mode==='ease';
   const base=e.timed?effectiveLevel(p)*5+15:p.goal==='endurance'?14:p.goal==='strength'?8:10;
   let reps=ease?(e.timed?15:Math.max(6,base-2)):base;
   if(!ease&&advice.mode==='progress')reps=e.timed?Math.min(45,advice.reps+5):Math.min(18,advice.reps+2);
   const available=bandLevels.filter(b=>(p.bandLevels||['light']).includes(b));
   return {id:e.id,sets:1,reps,rest:(p.goal==='strength'?90:60)+(ease?15:0),load:e.equipment==='dumbbells'?(!ease&&advice.unit===p.unit&&p.weights.includes(advice.load)?advice.load:Math.min(...p.weights)):0,unit:p.unit,band:e.equipment==='bands'?(!ease&&available.includes(advice.band)?advice.band:available[0]):null,advice:advice.text,maxSets:ease?1:effectiveLevel(p)===1?2:3};
 }
 function generate(p,history=[],options={}){
   validateProfile(p);const target=options.target??'full',minutes=Number(options.minutes??p.minutes);
   if(!Object.hasOwn(targets,target)||!Number.isInteger(minutes)||minutes<10||minutes>60)throw Error('Choose a muscle focus and a duration from 10 to 60 minutes.');
   const adaptation=feedback(history,target);if(adaptation.needsReview)throw Error(adaptation.text);
   const pool=eligible(p,history,target);if(!pool.length){const err=Error('No exercises match this focus with your equipment, level, and movement or pain restrictions. Choose an available focus below, or review your profile.');err.code='NO_EXERCISES';err.availableTargets=availableTargets(p,history);throw err;}
   const seed=Number(options.seed||0),last=realHistory(history)[0],used=new Set();
   const score=e=>({squat:4,hinge:3,push:4,pull:4,brace:3,lunge:3}[e.pattern]||0)+(e.equipment!=='bodyweight'?3:0)+(e.level===effectiveLevel(p)?1:0)-(['standing-brace','scapular-squeeze','chair-squat'].includes(e.id)?0.5:0)-(last?.logs.some(l=>l.id===e.id)?0.5:0)+((exercises.indexOf(e)+seed*7)%11)/20;
   const sorted=pool.slice().sort((a,b)=>score(b)-score(a)),ordered=[];
   for(const m of targets[target]){const e=sorted.find(e=>e.muscle===m);if(e){ordered.push(e);used.add(e.id);}}
   sorted.forEach(e=>{if(!used.has(e.id)){ordered.push(e);used.add(e.id);}});
   const plan={id:uid(),target,minutes,items:[],warmup:minutes>=20?180:120,cooldown:60,adaptation,profileSignature:JSON.stringify(p),rulesVersion:2};
   for(const e of ordered){const item=prescribe(e,p,history,adaptation);plan.items.push(item);if(planSeconds(plan)>minutes*60)plan.items.pop();if(plan.items.length>=(target==='full'?6:5))break;}
   if(!plan.items.length)throw Error('This workout needs more time. Increase your available minutes.');
   let changed=true;while(changed){changed=false;for(const i of plan.items){if(i.sets<i.maxSets){i.sets++;if(planSeconds(plan)<=minutes*60)changed=true;else i.sets--;}}}
   plan.seconds=planSeconds(plan);plan.note=target==='full'&&['legs','chest','back','core','glutes'].some(m=>!plan.items.some(i=>byId(i.id).muscle===m))?'This short or restricted session covers part of the body. Weekly sessions rotate your focus.':'Includes warm-up, work, rest between sets, transitions, and cooldown. Actual pace varies; the session stops at your selected active-time limit.';
   if(plan.seconds<minutes*60-120)plan.note+=' This focused session is shorter than your time limit; extra sets are not added beyond your starting volume.';
   return plan;
 }
 function replaceExercise(plan,index,id,p,history=[]){
   if(!Number.isInteger(index)||!plan.items[index])throw Error('Choose an exercise in this plan.');
   const old=plan.items[index],e=byId(id);if(!e||e.id===old.id||plan.items.some(i=>i.id===id)||e.muscle!==byId(old.id).muscle||!eligible(p,history,plan.target).some(x=>x.id===id))throw Error('This replacement is not compatible with the current plan and profile.');
   const adaptation=feedback(history,plan.target);if(adaptation.needsReview)throw Error(adaptation.text);
   const next=JSON.parse(JSON.stringify(plan)),item=prescribe(e,p,history,adaptation);item.sets=Math.min(old.sets,item.maxSets);next.items[index]=item;
   if(next.items.some(i=>!equipmentMatches(p,byId(i.id))))throw Error('Your equipment changed. Generate a fresh plan before replacing exercises.');
   while(planSeconds(next)>next.minutes*60&&item.sets>1)item.sets--;
   if(planSeconds(next)>next.minutes*60)throw Error('This replacement cannot fit the time limit without cutting needed rest. Choose another movement or a longer workout.');
   next.seconds=planSeconds(next);next.rulesVersion=2;next.profileSignature=JSON.stringify(p);return next;
 }
 function alternatives(item,p,history,plan){const index=plan.items.indexOf(item);return eligible(p,history,plan.target).filter(e=>{try{replaceExercise(plan,index,e.id,p,history);return true;}catch{return false;}});}
 function checkPlan(plan,p,history){
   validatePlan(plan);const allowed=new Set(eligible(p,history,plan.target).map(e=>e.id));
   if(feedback(history,plan.target).needsReview||plan.items.some(i=>!allowed.has(i.id)||(i.band&&!(p.bandLevels||['light']).includes(i.band))))throw Error('Your feedback or profile changed. Generate a fresh plan before starting.');
   if(plan.profileSignature!==JSON.stringify(p))throw Error('Your profile changed. Generate a fresh plan before starting.');
 }
 const dayKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
 const dayNumber=d=>Math.round(Date.parse(dayKey(d)+'T12:00:00Z')/86400000);
 function weeklyPlan(p,history,prefs={days:3,startDay:1},now=new Date()){
   if(![2,3].includes(prefs.days)||!Number.isInteger(prefs.startDay)||prefs.startDay<0||prefs.startDay>6)throw Error('Choose two or three training days and a valid first weekday.');
   const monday=new Date(now);monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
   const weekdays=(prefs.days===2?[0,3]:[0,2,4]).map(o=>(prefs.startDay+o)%7).sort((a,b)=>(a+6)%7-(b+6)%7);
   let n=0;return Array.from({length:7},(_,i)=>{
     const d=new Date(monday);d.setDate(d.getDate()+i);const key=dayKey(d),sessions=realHistory(history).filter(h=>h.scheduledDate===key&&h.logs.length),done=sessions.some(h=>h.completion>=0.9);
     if(!weekdays.includes(d.getDay()))return {date:key,kind:'recovery',title:'Recovery day',reason:'Rest, or choose comfortable walking and gentle mobility. No missed workouts to make up.'};
     const target=effectiveLevel(p)===1||prefs.days===2?'full':['upper','lower','full'][n%3];n++;
     if(done)return {date:key,kind:'done',target,title:'Session completed',reason:'Your completed workout is saved in Progress.'};
     const overlapping=realHistory(history).some(h=>h.logs.length&&dayNumber(d)-dayNumber(h.date)>=0&&dayNumber(d)-dayNumber(h.date)<2&&h.logs.some(l=>targets[target].includes(byId(l.id).muscle)));
     if(overlapping)return {date:key,kind:'recovery',target,title:'Extra recovery',reason:'Recent training used these muscles. Give them a recovery day; the next scheduled session stays in place.'};
     try{return {date:key,kind:'workout',target,plan:generate(p,history,{target,minutes:p.minutes,seed:i}),title:`${target==='full'?'Full-body':target==='upper'?'Upper-body':'Lower-body'} strength`,reason:sessions.length?'A partial session is saved. Return when recovered.':'Personalized to your assessment, equipment, and exercise check-ins.'};}
     catch(err){return {date:key,kind:'review',target,title:'Review your profile',reason:err.message};}
   });
 }
 function loadState(input){
   const s=JSON.parse(JSON.stringify(input));validateState(s);s.profile={...defaults(),...s.profile};s.weeklyPrefs=s.weeklyPrefs||{days:3,startDay:1};
   for(const plan of [s.plan,s.active?.plan].filter(Boolean)){plan.items.forEach(i=>{if(byId(i.id).equipment==='bands'&&!i.band)i.band=(s.profile.bandLevels||['light'])[0];});plan.seconds=planSeconds(plan);plan.profileSignature=JSON.stringify(s.profile);}
   s.revision=2;return s;
 }

 function stats(history,now=new Date()){
   const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-6);
   const recent=history.filter(h=>new Date(h.date)>=start&&new Date(h.date)<=now&&h.logs.length);
   return {workouts:recent.length,minutes:Math.round(recent.reduce((n,h)=>n+h.seconds,0)/60),sets:recent.reduce((n,h)=>n+h.logs.length,0),total:history.filter(h=>h.logs.length).length};
 }
 function validatePlan(p){
   if(!p||typeof p.id!=='string'||!Object.hasOwn(targets,p.target)||!Number.isInteger(p.minutes)||p.minutes<10||p.minutes>60||!Number.isFinite(p.seconds)||p.seconds<0||p.seconds>p.minutes*60||!Number.isFinite(p.warmup)||p.warmup<0||p.warmup>600||!Number.isFinite(p.cooldown)||p.cooldown<0||p.cooldown>600||!Array.isArray(p.items)||!p.items.length||p.items.length>10)throw Error('Invalid workout plan.');
   if(new Set(p.items.map(i=>i.id)).size!==p.items.length)throw Error('A plan contains duplicate exercises.');
   p.items.forEach(i=>{if(!byId(i.id)||!Number.isInteger(i.sets)||i.sets<1||i.sets>5||!Number.isInteger(i.reps)||i.reps<1||i.reps>180||!Number.isFinite(i.rest)||i.rest<0||i.rest>300||!Number.isFinite(i.load)||i.load<0||i.load>200||!['kg','lb'].includes(i.unit))throw Error('Invalid exercise prescription.');if(i.band&&!bandLevels.includes(i.band))throw Error('Invalid band resistance.');});if(planSeconds(p)>p.minutes*60||(p.rulesVersion===2&&p.seconds!==planSeconds(p)))throw Error('Workout duration does not match its prescription.');return p;
 }
 function validateLogs(logs){if(!Array.isArray(logs)||logs.length>100)throw Error('Invalid set history.');for(const l of logs)if(!byId(l.id)||!Number.isFinite(l.reps)||l.reps<1||l.reps>500||!Number.isFinite(l.load)||l.load<0||l.load>200||!['kg','lb'].includes(l.unit))throw Error('Invalid set values.');for(const l of logs)if((l.band&&!bandLevels.includes(l.band))||(l.feedback&&!ratingValues.includes(l.feedback)))throw Error('Invalid exercise feedback.');}
 function validateState(s){
   if(!s||s.version!==1||(s.revision!==undefined&&s.revision!==2)||!Array.isArray(s.history)||s.history.length>5000)throw Error('This is not a supported HomeFit backup.');
   validateProfile(s.profile);
   if(s.weeklyPrefs&&(![2,3].includes(s.weeklyPrefs.days)||!Number.isInteger(s.weeklyPrefs.startDay)||s.weeklyPrefs.startDay<0||s.weeklyPrefs.startDay>6))throw Error('Invalid weekly preferences.');
   s.history.forEach(h=>{if(typeof h.id!=='string'||!Number.isFinite(Date.parse(h.date))||!Object.hasOwn(targets,h.target)||!['easy','right','hard','pain'].includes(h.feedback)||!Number.isFinite(h.seconds)||h.seconds<0||h.seconds>86400||!Number.isFinite(h.completion)||h.completion<0||h.completion>1||typeof h.notes!=='string'||h.notes.length>500)throw Error('Invalid workout history.');validateLogs(h.logs);if(h.exerciseFeedback&&(typeof h.exerciseFeedback!=='object'||Array.isArray(h.exerciseFeedback)||Object.entries(h.exerciseFeedback).some(([id,v])=>!byId(id)||!ratingValues.includes(v))))throw Error('Invalid exercise check-in.');if(h.generalPain!==undefined&&typeof h.generalPain!=='boolean')throw Error('Invalid general pain report.');if(h.painResolvedAt&&!Number.isFinite(Date.parse(h.painResolvedAt)))throw Error('Invalid pain resolution.');if(h.scheduledDate&&!/^\d{4}-\d{2}-\d{2}$/.test(h.scheduledDate))throw Error('Invalid scheduled day.');if(h.painExercises&&(!Array.isArray(h.painExercises)||h.painExercises.some(id=>!byId(id))))throw Error('Invalid pain feedback.');});
   if(new Set(s.history.map(h=>h.id)).size!==s.history.length)throw Error('Duplicate workout records.');
   if(s.plan)validatePlan(s.plan);
   if(s.active){const a=s.active;validatePlan(a.plan);validateLogs(a.logs);if(typeof a.id!=='string'||!['warmup','work','rest','cooldown','review'].includes(a.phase)||!Number.isInteger(a.index)||a.index<0||a.index>=a.plan.items.length||!Number.isInteger(a.set)||a.set<1||a.set>a.plan.items[a.index].sets||!Number.isFinite(a.remaining)||a.remaining<0||a.remaining>10000||!Number.isFinite(a.elapsed)||a.elapsed<0||a.elapsed>86400||typeof a.paused!=='boolean')throw Error('Invalid active session.');if(a.phase==='rest'&&(!Number.isInteger(a.nextIndex)||a.nextIndex<0||a.nextIndex>=a.plan.items.length||!Number.isInteger(a.nextSet)||a.nextSet<1||a.nextSet>a.plan.items[a.nextIndex].sets))throw Error('Invalid next set.');if(a.painExercise&&!byId(a.painExercise))throw Error('Invalid pain report.');if(a.logs.length>a.plan.items.reduce((n,i)=>n+i.sets,0))throw Error('Too many logged sets.');}
   return s;
 }
 function sample(now=new Date()){
   return [12,9,7,5,3,1].map((days,i)=>{const date=new Date(now);date.setDate(date.getDate()-days);date.setHours(10,0,0,0);return {id:`sample-${i}`,date:date.toISOString(),target:['full','upper','core'][i%3],seconds:900+i*120,completion:1,feedback:i%2?'right':'easy',notes:'Example session. Sample data is excluded from coaching decisions.',sample:true,logs:['squat','wall-push-up','bridge','standing-brace'].flatMap(id=>Array.from({length:2},()=>({id,reps:10+i,load:0,unit:'kg'})))};});
 }
 const api={assess,effectiveLevel,bandLevels,bandTypes,equipmentMatches,pendingEquipment,availableTargets,painStatus,exerciseAdvice,planSeconds,replaceExercise,checkPlan,weeklyPlan,dayKey,loadState,exercises,byId,levels,targets,restrictions,defaults,fresh,uid,validateProfile,feedback,eligible,duration,generate,alternatives,stats,validateState,sample};root.HomeFit=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
