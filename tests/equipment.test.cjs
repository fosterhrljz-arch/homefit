const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('../engine.js');
const bandProfile=types=>({...H.defaults(),level:'advanced',equipment:['bodyweight','bands'],bandTypes:types});
const miniIds=['band-side-step','band-bridge','band-clamshell'];
const armIds=['self-resisted-curl','narrow-wall-push-up','narrow-knee-push-up'];
const pain=ids=>[{id:'pain',date:'2026-11-11T10:00:00',target:'arms',seconds:0,completion:0,feedback:'pain',logs:[],painExercises:ids}];

test('bodyweight arm sessions include biceps and triceps without weights or bands',()=>{
 for(const level of Object.keys(H.levels))for(const minutes of [10,25,60]){
  const p={...H.defaults(),level,minutes},plan=H.generate(p,[],{target:'arms'});
  assert.ok(plan.items.some(i=>i.id==='self-resisted-curl'));
  assert.ok(plan.items.some(i=>i.id==='narrow-wall-push-up'));
  assert.ok(plan.items.every(i=>armIds.includes(i.id)&&H.byId(i.id).equipment==='bodyweight'&&!i.band&&!i.load));
  assert.ok(plan.seconds<=minutes*60);assert.doesNotThrow(()=>H.checkPlan(plan,p,[]));
  if(level==='beginner')assert.ok(!plan.items.some(i=>i.id==='narrow-knee-push-up'));
 }
});
test('new arm movements honor limitations, assessment, and movement-specific pain',()=>{
 const p={...H.defaults(),level:'advanced',limitations:['floor','knees']};
 assert.deepEqual(H.eligible(p,[],'arms').map(e=>e.id).sort(),['narrow-wall-push-up','self-resisted-curl']);
 assert.ok(H.generate(p,pain(['narrow-wall-push-up']),{target:'arms'}).items.every(i=>i.id==='self-resisted-curl'));
 const gentle={...p,limitations:[],assessment:{activity:'none',movement:'support',recovery:'low'}};
 assert.ok(H.generate(gentle,[],{target:'arms'}).items.every(i=>H.byId(i.id).level===1&&i.sets===1));
 for(const limitation of ['wrists','shoulders'])assert.equal(H.eligible({...p,limitations:[limitation]},[],'arms').length,0);
});
test('unavailable focuses return actionable alternatives without bypassing restrictions or pain',()=>{
 for(const [p,history] of [[{...H.defaults(),limitations:['wrists']},[]],[H.defaults(),pain(armIds)]]){
  assert.throws(()=>H.generate(p,history,{target:'arms'}),err=>{
   assert.equal(err.code,'NO_EXERCISES');assert.ok(err.availableTargets.includes('core'));assert.ok(!err.availableTargets.includes('arms'));
   for(const target of err.availableTargets){const plan=H.generate(p,history,{target});assert.ok(plan.items.length);assert.ok(plan.items.every(i=>!armIds.includes(i.id)));}
   return true;
  });
 }
 assert.deepEqual(H.availableTargets(H.defaults(),[{...pain([])[0],generalPain:true}]),[]);
});
test('all band exercises explicitly require the correct type and describe it in their guidance',()=>{
 const bands=H.exercises.filter(e=>e.equipment==='bands');assert.equal(bands.length,12);
 for(const e of bands){assert.equal(e.bandType,miniIds.includes(e.id)?'mini':'long');assert.match(e.steps.join(' '),e.bandType==='mini'?/mini loop/:/long (?:light )?band/);}
 assert.equal(bands.filter(e=>e.bandType==='long').length,9);assert.equal(bands.filter(e=>e.bandType==='mini').length,3);
});
test('long-only, mini-only, both, and unconfirmed inventories constrain generation, swaps, and weekly plans',()=>{
 let generated=0,swapped=0;
 for(const types of [[],['long'],['mini'],['long','mini']])for(const level of Object.keys(H.levels))for(const minutes of [10,25,60]){
  const p={...bandProfile(types),level,minutes};
  const check=i=>{const e=H.byId(i.id);if(e.equipment==='bands')assert.ok(types.includes(miniIds.includes(e.id)?'mini':'long'),`${types}: ${e.id}`);};
  for(const target of Object.keys(H.targets)){
   const plan=H.generate(p,[],{target});generated++;plan.items.forEach(check);assert.ok(plan.seconds<=minutes*60);
   for(const [n,item] of plan.items.entries())for(const e of H.alternatives(item,p,[],plan)){const next=H.replaceExercise(plan,n,e.id,p);next.items.forEach(check);assert.ok(next.seconds<=minutes*60);swapped++;}
  }
  for(const day of H.weeklyPlan(p,[],{days:3,startDay:1},new Date('2026-11-11T12:00:00')))if(day.plan)day.plan.items.forEach(check);
 }
 assert.equal(generated,360);assert.ok(swapped>100);
});
test('explicit wrong-type replacements and obsolete saved plans cannot bypass band eligibility',()=>{
 for(const [types,wrong] of [[['mini'],'band-hinge'],[['long'],'band-bridge'],[[],'band-hinge']]){
  const p=bandProfile(types),plan=H.generate(p,[],{target:'glutes'}),before=JSON.stringify(plan);
  assert.throws(()=>H.replaceExercise(plan,0,wrong,p),/not compatible/);assert.equal(JSON.stringify(plan),before);
 }
 const old=bandProfile(['long']),plan=H.generate(old,[],{target:'arms'});assert.ok(plan.items.some(i=>i.id==='band-curl'));
 const changed=bandProfile(['mini']);plan.profileSignature=JSON.stringify(changed);
 assert.throws(()=>H.checkPlan(plan,changed,[]),/fresh plan/);
 assert.ok(H.eligible({...old,equipment:['bodyweight']}).every(e=>e.equipment!=='bands'));
 const both=bandProfile(['long','mini']),mixed=H.generate(both,[],{target:'glutes',minutes:25});
 mixed.items=mixed.items.filter(i=>['band-hinge','band-bridge'].includes(i.id));assert.equal(mixed.items.length,2);mixed.seconds=H.planSeconds(mixed);
 assert.throws(()=>H.replaceExercise(mixed,mixed.items.findIndex(i=>i.id==='band-bridge'),'clamshell',bandProfile(['mini'])),/equipment changed/);
});
test('band types are optional for legacy imports but unknown or duplicate selections are rejected',()=>{
 const p=bandProfile([]);delete p.bandTypes;assert.doesNotThrow(()=>H.validateProfile(p));assert.ok(H.eligible(p).every(e=>e.equipment!=='bands'));
 for(const bandTypes of [null,'long',['short'],['long','long']])assert.throws(()=>H.validateProfile({...p,bandTypes}),/band types/);
});
test('legacy v2 migration never guesses band types or drops existing workout records',()=>{
 const original=H.fresh();original.profile=bandProfile(['long']);original.plan=H.generate(original.profile,[],{target:'arms'});
 original.active={id:'active',plan:structuredClone(original.plan),index:0,set:1,phase:'warmup',remaining:120,elapsed:30,paused:false,logs:[]};
 original.history=H.sample();delete original.profile.bandTypes;const before=JSON.stringify(original),loaded=H.loadState(original);
 assert.equal(JSON.stringify(original),before);assert.deepEqual(loaded.profile.bandTypes,[]);assert.deepEqual(loaded.history,original.history);
 assert.equal(loaded.active.id,original.active.id);assert.deepEqual(loaded.active.logs,original.active.logs);
 assert.ok(H.pendingEquipment(loaded.active,loaded.profile).some(e=>e.id==='band-curl'));
 assert.deepEqual(H.pendingEquipment(loaded.active,{...loaded.profile,bandTypes:['long']}),[]);
});
test('saved-session equipment checks consider remaining work, including after rest',()=>{
 const p=bandProfile(['mini']),plan={items:[{id:'band-curl'},{id:'band-bridge'}]};
 const active={plan,index:0,phase:'work'};assert.deepEqual(H.pendingEquipment(active,p).map(e=>e.id),['band-curl']);
 assert.deepEqual(H.pendingEquipment({...active,phase:'rest',nextIndex:1},p),[]);
 assert.deepEqual(H.pendingEquipment({...active,phase:'rest',nextIndex:0},p).map(e=>e.id),['band-curl']);
 for(const phase of ['cooldown','review'])assert.deepEqual(H.pendingEquipment({...active,phase},p),[]);
});
