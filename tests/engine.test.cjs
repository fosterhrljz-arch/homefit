const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('../engine.js');
const D=require('../exercises.js');
const record=(feedback,extra={})=>({id:H.uid(),date:new Date().toISOString(),target:'full',seconds:600,completion:1,feedback,painExercises:feedback==='pain'?['squat']:[],notes:'',logs:[{id:'squat',reps:10,load:0,unit:'kg'}],...extra});

test('45 unique exercises have complete form cues, valid alternatives and two demonstration poses',()=>{
 assert.equal(H.exercises.length,45);assert.equal(new Set(H.exercises.map(e=>e.id)).size,45);
 for(const e of H.exercises){assert.equal(e.steps.length,3);assert.ok(e.cue.length>20);e.alternatives.forEach(id=>assert.ok(H.byId(id)));e.poses.forEach(p=>assert.equal(D.poses[p].length,11));}
});
test('every profile, time, target and equipment combination stays within its budget and constraints',()=>{
 let count=0;
 for(const level of Object.keys(H.levels))for(const minutes of [10,15,20,25,30,45,60])for(const target of Object.keys(H.targets))for(const equipment of [['bodyweight'],['bodyweight','bands'],['bodyweight','dumbbells','mat']])for(const limitations of [[],['knees'],['back','wrists'],['floor','shoulders'],H.restrictions]){
  const p={...H.defaults(),bandTypes:['long','mini'],level,minutes,equipment,limitations};const eligible=H.eligible(p,[],target);
  if(!eligible.length){assert.throws(()=>H.generate(p,[],{target}));continue;}
  const plan=H.generate(p,[],{target});assert.ok(plan.seconds<=minutes*60);assert.ok(plan.items.length);assert.equal(new Set(plan.items.map(i=>i.id)).size,plan.items.length);assert.equal(plan.seconds,plan.warmup+plan.cooldown+plan.items.reduce((n,i)=>n+H.duration(i),0)-plan.items.at(-1).rest-20);
  for(const item of plan.items){const e=H.byId(item.id);assert.ok(equipment.includes(e.equipment));assert.ok(e.level<=H.levels[level]);assert.ok(!e.avoid.some(l=>limitations.includes(l)));assert.ok(H.targets[target].includes(e.muscle));assert.ok(item.sets>=1&&item.sets<=3);}
  count++;
 }
 assert.ok(count>2000);
});
test('default full-body session covers squat, hinge, push, pull and core',()=>{const plan=H.generate(H.defaults());for(const p of ['squat','hinge','push','pull','brace'])assert.ok(plan.items.some(i=>H.byId(i.id).pattern===p));});
test('short full-body sessions distribute work across upper and lower body before adding sets',()=>{const plan=H.generate(H.defaults(),[],{target:'full',minutes:10});assert.ok(plan.items.some(i=>H.byId(i.id).muscle==='legs'));assert.ok(plan.items.some(i=>H.byId(i.id).muscle==='chest'));assert.ok(plan.items.every(i=>i.sets===1));});
test('two easy visits progress only the movement performed, never every exercise',()=>{const p=H.defaults(),two=[record('easy'),record('easy')];assert.equal(H.exerciseAdvice('squat',[record('easy')]).mode,'steady');assert.equal(H.exerciseAdvice('squat',two).mode,'progress');assert.equal(H.exerciseAdvice('dead-bug',two).mode,'steady');const plan=H.generate(p,two,{target:'legs'});assert.equal(plan.items.find(i=>i.id==='squat').reps,12);assert.equal(plan.items.find(i=>i.id==='calf-raise').reps,10);});
test('hard or incomplete session lowers volume and adds recovery',()=>{const p=H.defaults(),plan=H.generate(p,[record('hard')]);assert.equal(plan.adaptation.mode,'ease');assert.ok(plan.items.every(i=>i.sets===1&&i.rest===75));assert.equal(H.feedback([record('right',{completion:.4})]).mode,'ease');});
test('pain before the first logged set still excludes that movement',()=>{const h=[record('pain',{logs:[],painExercises:['squat']})];assert.equal(H.feedback(h).mode,'caution');assert.ok(!H.eligible(H.defaults(),h).some(e=>e.id==='squat'));});
test('pain exclusion persists through later sessions; samples never affect coaching',()=>{const h=[record('pain'),record('right',{date:new Date(Date.now()+1000).toISOString()})];assert.ok(!H.eligible(H.defaults(),h).some(e=>e.id==='squat'));assert.equal(H.feedback(H.sample()).mode,'steady');assert.equal(H.feedback([record('pain',{sample:true})]).excluded.length,0);});
test('unknown or impossible equipment and profiles fail clearly',()=>{for(const overrides of [{weight:0},{weight:NaN},{weights:[] ,equipment:['bodyweight','dumbbells']},{weights:[-2]},{level:'expert'},{limitations:['unknown']},{minutes:0}])assert.throws(()=>H.validateProfile({...H.defaults(),bandTypes:['long','mini'],...overrides}));assert.throws(()=>H.generate(H.defaults(),[],{target:'invalid'}));});
test('custom dumbbell weights select the lightest available, never body-weight-derived loads',()=>{const p={...H.defaults(),bandTypes:['long','mini'],level:'intermediate',equipment:['bodyweight','dumbbells'],weights:[12.5,7.5,20]};const plan=H.generate(p,[],{target:'upper'});assert.ok(plan.items.some(i=>i.load));plan.items.filter(i=>i.load).forEach(i=>assert.equal(i.load,7.5));const other=H.generate({...p,weight:120},[],{target:'upper'});assert.deepEqual(plan.items,other.items);});
test('mat is optional comfort equipment and never changes available movements',()=>{assert.deepEqual(H.eligible(H.defaults()).map(e=>e.id),H.eligible({...H.defaults(),bandTypes:['long','mini'],equipment:['bodyweight','mat']}).map(e=>e.id));});
test('swaps remain compatible and avoid duplicates',()=>{const p={...H.defaults(),bandTypes:['long','mini'],level:'advanced',equipment:['bodyweight','bands','dumbbells']},plan=H.generate(p);for(const i of plan.items)for(const e of H.alternatives(i,p,[],plan)){assert.equal(e.muscle,H.byId(i.id).muscle);assert.ok(!plan.items.some(i=>i.id===e.id));}});
test('backup validation accepts real data and rejects corrupt nested records',()=>{const s=H.fresh();s.history=H.sample();s.plan=H.generate(s.profile);assert.equal(H.validateState(s),s);for(const mutate of [s=>s.version=3,s=>s.history[0].logs[0].id='missing',s=>s.history[0].feedback='bad',s=>s.plan.items[0].sets=-1,s=>s.plan.minutes=1,s=>s.history.push(s.history[0]),s=>s.history[0].painExercises=['missing']]){const copy=structuredClone(s);mutate(copy);assert.throws(()=>H.validateState(copy));}});
test('rolling seven-day statistics exclude older, future, and zero-set sessions',()=>{const now=new Date('2026-11-11T12:00:00'),history=[record('right',{date:'2026-11-11T10:00:00',seconds:600}),record('right',{date:'2026-11-05T10:00:00',seconds:300}),record('right',{date:'2026-11-04T10:00:00'}),record('right',{date:'2026-11-12T10:00:00'}),record('right',{date:'2026-11-11T11:00:00',logs:[]})];assert.deepEqual(H.stats(history,now),{workouts:2,minutes:15,sets:2,total:4});});
