import test from 'node:test'
import assert from 'node:assert/strict'
import {PerspectiveCamera,Vector3} from 'three'
import {updateTaskSearch,placeTaskHint} from '../src/taskGuidance.ts'

test('the task sign appears only after 45 seconds of active searching',()=>{
 const search={key:'',seconds:0}
 assert.equal(updateTaskSearch(search,'solar',44.9,true,false),false)
 assert.equal(updateTaskSearch(search,'solar',90,false,false),false)
 assert.equal(search.seconds,44.9)
 assert.equal(updateTaskSearch(search,'solar',.1,true,false),true)
 assert.equal(updateTaskSearch(search,'solar',10,false,false),false)
 assert.equal(updateTaskSearch(search,'solar',0,true,false),true)
})

test('reaching a task or starting another waypoint clears its search time',()=>{
 const search={key:'solar',seconds:48}
 assert.equal(updateTaskSearch(search,'solar',1,true,true),false)
 assert.equal(search.seconds,0)
 assert.equal(updateTaskSearch(search,'solar',20,true,false),false)
 assert.equal(updateTaskSearch(search,'airlock',1,true,false),false)
 assert.equal(search.seconds,1)
 assert.equal(updateTaskSearch(search,'airlock',30,false,true),false)
 assert.equal(search.seconds,0)
})

test('the sign projects onto its world location and clamps behind-camera targets to an edge',()=>{
 const camera=new PerspectiveCamera(65,1000/680,.045,600)
 camera.updateProjectionMatrix()
 const element={style:{setProperty(name,value){this[name]=value}},classList:{toggle(name,value){this[name]=value}}}
 placeTaskHint(element,new Vector3(0,0,-10),camera,1000,680)
 assert.equal(element.style.left,'500px')
 assert.equal(element.style.top,'340px')
 assert.equal(element.classList['at-edge'],false)
 placeTaskHint(element,new Vector3(-3,0,8),camera,1000,680)
 assert.equal(element.style.left,'48px')
 assert.equal(element.classList['at-edge'],true)
 placeTaskHint(element,new Vector3(0,0,8),camera,1000,680)
 assert.equal(element.style.left,'952px')
 for(const point of [new Vector3(12,6,-2),new Vector3(0,12,-1),new Vector3(0,0,0)]){
  placeTaskHint(element,point,camera,390,844)
  const x=parseFloat(element.style.left),y=parseFloat(element.style.top)
  assert(Number.isFinite(x)&&Number.isFinite(y))
  assert(x>=46&&x<=344&&y>=139&&y<=719)
 }
})
