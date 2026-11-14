import test from 'node:test'
import assert from 'node:assert/strict'
import {fresh,calculate,advance,selectChoice,performJob,validSave} from '../src/engine.ts'
import {enrollment,fieldAction,status} from '../src/tasks.ts'
function operate(s,cmd,v){const n=fieldAction(s,status(s).station,cmd,v);assert.notEqual(n,s,cmd+' rejected on sol '+s.sol);return n}
test('a wrong fault, mismatched lead, remote station or incomplete test cannot certify the array',()=>{
 let s=enrollment(fresh());assert.equal(calculate(s).solar,12.01)
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
 let s=enrollment(fresh())
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
  s=advance(selectChoice(s,0))
 }
 assert.equal(s.status,'success',s.reason);assert.ok(validSave(s))
})

