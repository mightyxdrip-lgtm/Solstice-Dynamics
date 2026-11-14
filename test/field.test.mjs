import test from 'node:test'
import assert from 'node:assert/strict'
import {walk,obstructed,nearestStation,outsideBounds,outerBoxes,outerStations} from '../src/navigation.ts'
import {terrainHeight} from '../src/terrain.ts'
const pose=(x=0,z=0)=>({x,z,yaw:0,pitch:0,zone:'outside'})
test('camera-relative walking keeps the same speed on diagonals',()=>{
 const p=pose();assert.ok(Math.abs(walk(p,1,1,3,()=>false)-3)<1e-7)
 p.yaw=Math.PI/2;const old=p.x;walk(p,0,1,2,()=>false);assert.ok(Math.abs(p.x-old+2)<1e-7)
})
test('swept movement stops at equipment even with a long step',()=>{
 const p=pose(0,5),wall=[{x:0,z:0,hx:2,hz:.1}]
 walk(p,0,1,12,(x,z)=>obstructed(x,z,outsideBounds,wall,[]))
 assert.ok(p.z>=.39 && p.z<.55)
})
test('solid enclosures and boulders block the player, exterior airlock approaches stay open',()=>{
 assert.ok(obstructed(10,-9,outsideBounds,outerBoxes,[]))
 assert.ok(obstructed(23,20,outsideBounds,[],[{x:23,z:20,radius:1}]))
 for(const [x,z] of [[-8,2.65],[6,9.5],[8.55,-5.5]])assert.equal(obstructed(x,z,outsideBounds,outerBoxes,[]),false)
})
test('interaction requires proximity and facing the terminal',()=>{
 const p=pose(-5.55,9.35)
 assert.equal(nearestStation(p,outerStations),'solar')
 p.yaw=Math.PI;assert.equal(nearestStation(p,outerStations),'')
 p.z=25;assert.equal(nearestStation(p,outerStations),'')
})
test('terrain holds the landing pad level and shapes walkable impact basins',()=>{
 assert.equal(terrainHeight(0,0),terrainHeight(-10,8))
 assert.ok(terrainHeight(36,17)<terrainHeight(44,17)-1)
 assert.ok(Number.isFinite(terrainHeight(115,70)))
})

