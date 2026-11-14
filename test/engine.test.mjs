import test from 'node:test'
import assert from 'node:assert/strict'
import {fresh,events,calculate,selectChoice,performJob,changeSettings,advance,jobBlock,validSave,resources,capacities} from '../src/engine.ts'

test('initial reserves and sol one balance',()=>{
 const s=fresh(),p=calculate(s)
 assert.equal(p.solar,24.03);assert.equal(p.demand,33);assert.equal(p.recovered,7.33);assert.equal(p.oxygenMade,3.15);assert.equal(p.harvest,3.06)
 assert.equal(p.result.water,69.33);assert.equal(p.result.oxygen,16.75);assert.equal(p.result.power,73.03)
 assert.equal(advance(s),s)
})
test('dust reduces generation and equipment wear lowers recovery',()=>{
 const s=fresh();assert.ok(calculate({...s,sol:2}).solar<calculate(s).solar)
 assert.ok(calculate({...s,condition:50}).recovered<calculate(s).recovered)
})
test('irrigation and power allocations trade stored water and energy for food',()=>{
 const s=fresh(),low=calculate(changeSettings(s,{irrigation:'low'})),high=calculate(changeSettings(s,{irrigation:'high'}))
 assert.ok(high.harvest>low.harvest);assert.ok(high.result.water<low.result.water);assert.ok(high.demand>low.demand)
 const support=calculate(changeSettings(s,{priority:'life'}));assert.ok(support.recovered>calculate(s).recovered);assert.ok(support.oxygenMade>calculate(s).oxygenMade)
 assert.ok(calculate(changeSettings(s,{air:'eco'})).oxygenMade<calculate(s).oxygenMade)
})
test('shortages limit powered output and crops need irrigation',()=>{
 const s={...fresh(),sol:2};s.reserves.power=0
 assert.ok(calculate(s).powered<1)
 s.reserves.water=0;assert.equal(calculate(s).harvest,0)
})
test('sheltering protects crew on sol four',()=>{
 const s={...fresh(),sol:4}
 assert.equal(calculate(selectChoice(s,0)).radiationLoss,0)
 assert.equal(calculate(selectChoice(s,1)).radiationLoss,18)
 assert.equal(calculate(selectChoice(performJob(s,'shield'),1)).radiationLoss,12)
})
test('orders have immediate costs, action budget and reserved parts',()=>{
 const s=fresh(),next=performJob(s,'array')
 assert.deepEqual([next.parts,next.actions,next.reserves.power,next.solar],[2,1,79,1]);assert.equal(s.parts,4)
 const booked=selectChoice({...s,sol:2,parts:1},0)
 assert.ok(jobBlock(booked,'repair'));assert.equal(performJob(booked,'repair'),booked)
 const surveyed=performJob(s,'survey');assert.ok(jobBlock(surveyed,'survey'));assert.match(surveyed.log.at(-1).text,/Sol 2/)
 const used=performJob(surveyed,'repair');assert.equal(used.actions,0);assert.equal(performJob(used,'shield'),used)
})
test('all advisory responses change consequences',()=>{
 for(let i=0;i<events.length;i++){
 let s={...fresh(),sol:i+1,done:i}
 assert.notDeepEqual(advance(selectChoice(s,0)),advance(selectChoice(s,1)))
 assert.notDeepEqual(calculate(selectChoice(s,0)),calculate(selectChoice(s,1)))
 }
})
function win(){
 let s=performJob(fresh(),'array')
 for(let i=1;i<=7;i++){
 s=selectChoice(s,0)
 if(i===3)s=changeSettings(s,{irrigation:'low'})
 s=advance(s)
 assert.ok(validSave(s))
 }
 return s
}
test('seven-sol mission is winnable, replayable and deterministic',()=>{
 const s=win();assert.equal(s.status,'success');assert.equal(s.done,7);assert.equal(s.history.length,8);assert.equal(advance(s),s);assert.deepEqual(win(),s)
 for(const h of s.history)for(const k of resources)assert.ok(h.reserves[k]>=0&&h.reserves[k]<=capacities[k])
})
test('an unbalanced crop-first strategy can end a real mission early',()=>{
 let s=changeSettings(fresh(),{irrigation:'high',priority:'crops'})
 while(s.status==='active')s=advance(selectChoice(s,1))
 assert.equal(s.status,'failure');assert.match(s.reason,/reserve|condition/);assert.ok(s.done<7)
})
test('save validation rejects damaged records and round trips played missions',()=>{
 assert.equal(validSave({}),false);assert.equal(validSave({...fresh(),sol:8}),false)
 assert.equal(validSave({...fresh(),history:[{}]}),false);assert.ok(validSave(JSON.parse(JSON.stringify(win()))))
})

