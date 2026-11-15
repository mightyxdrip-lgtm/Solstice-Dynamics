import test from 'node:test'
import assert from 'node:assert/strict'
import {fresh,calculate,advance,selectChoice,performJob,validSave} from '../src/engine.ts'
import {enrollment,fieldAction,status,roverAction} from '../src/tasks.ts'
import {roverBay,surveyBeacon,crystalRock} from '../src/roverRoute.ts'
const bay={...roverBay,zone:'outside'},beacon={...surveyBeacon,zone:'outside'}
function survey(s){
 for(const [action,site] of [['board',bay],['arrive',beacon],['pick',beacon],['extract',beacon],['pack',beacon],['arrive',bay],['deliver',bay]])
  s=roverAction(s,action,site,crystalRock)
 return s
}
test('a core must be found, drilled, stowed and delivered at the correct locations',()=>{
 let s=enrollment(fresh())
 assert.equal(status(s).station,'rover');assert.equal(roverAction(s,'arrive',beacon),s)
 assert.equal(roverAction(s,'board',beacon),s);assert.equal(roverAction(s,'board',{...bay,zone:'hab'}),s)
 s=roverAction(s,'board',bay);assert.equal(status(s).station,'surveyBeacon')
 assert.equal(roverAction(s,'arrive',bay),s)
 s=roverAction(s,'arrive',beacon);assert.ok(validSave(s));assert.equal(s.fieldwork.survey,'chooseRock')
 assert.equal(roverAction(s,'pick',beacon,0),s);assert.equal(roverAction(s,'pack',beacon),s)
 assert.equal(roverAction(s,'pick',bay,crystalRock),s)
 s=roverAction(s,'pick',beacon,crystalRock);assert.equal(s.fieldwork.survey,'drill')
 s=roverAction(s,'extract',beacon);assert.equal(s.fieldwork.survey,'stow')
 assert.equal(roverAction(s,'arrive',bay),s)
 s=roverAction(s,'pack',beacon);assert.equal(status(s).station,'roverHome')
 assert.equal(roverAction(s,'arrive',beacon),s)
 s=roverAction(s,'arrive',bay);assert.equal(s.fieldwork.survey,'unload')
 assert.equal(roverAction(s,'deliver',beacon),s);assert.ok(validSave(s))
 s=roverAction(s,'deliver',bay);assert.equal(status(s).station,'solarProbe');assert.equal(roverAction(s,'deliver',bay),s)
})
function operate(s,cmd,v){const n=fieldAction(s,status(s).station,cmd,v);assert.notEqual(n,s,cmd+' rejected on sol '+s.sol);return n}
test('a wrong fault, mismatched lead, remote station or incomplete test cannot certify the array',()=>{
 let s=survey(enrollment(fresh()));assert.equal(calculate(s).solar,12.01)
 assert.equal(advance(selectChoice(s,0)).sol,1)
 assert.equal(fieldAction(s,'solar','scan',0),s)
 for(const i of [0,1,2])s=operate(s,'scan',i)
 assert.equal(fieldAction(s,'solarProbe','identify',2),s)
 s=operate(s,'identify',1);assert.equal(fieldAction(s,'solarProbe','wire',1),s)
 const isolated=operate(s,'isolate',1);assert.equal(calculate(isolated).solar,19.22)
 s=operate(operate(s,'wire',3),'wire',0);assert.equal(calculate(s).solar,24.03)
 assert.equal(fieldAction(s,'solar','load',12),s);assert.ok(!status(s).complete)
 assert.ok(validSave(s));assert.ok(!validSave({...s,fieldwork:{...s.fieldwork,lamp:-1}}))
})
test('all seven field assignments can support a successful handover with positive reserves',()=>{
 let s=survey(enrollment(fresh()))
 const routes=[
 [['scan',0],['scan',1],['scan',2],['identify',1],['wire',0],['wire',3],['load',24],['dispatch',0]],
 [['scan',0],['scan',1],['identify',1],['valve',4],['seal'],['flow']],
 [['scan',0],['scan',1],['lamp',65],['water',4],['stabilize'],['tick'],['tick'],['tick'],['tick']],
 [['archive',1],['charge'],['berth',0],['berth',2],['berth',1],['berth',3],['pressure']],
 [['scan',1],['scan',0],['identify',1],['sealtest',1]],
 [['scan',0],['scan',1],['valve',4],['flow']],
 [['scan',0],['load','meter']]
 ]
 for(const [i,route] of routes.entries()){
  assert.equal(s.sol,i+1);assert.ok(!status(s).complete)
  for(const [cmd,v] of route)s=operate(s,cmd,v==='meter'?Math.round(calculate(s).solar):v)
  assert.ok(status(s).complete);assert.ok(validSave(s))
  if(i===0)s=performJob(s,'array')
  if(i===6){
   const lost=advance(selectChoice(s,1))
   assert.equal(lost.stormEnding,'swept');assert.equal(lost.status,'failure')
   assert.equal(advance(lost),lost);assert.ok(validSave(lost))
  }
  s=advance(selectChoice(s,0))
 }
 assert.equal(s.status,'success',s.reason);assert.equal(s.stormEnding,'escape');assert.ok(validSave(s))
})

