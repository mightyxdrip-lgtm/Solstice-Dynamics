import * as T from 'three'
import {Assembly} from './buildings'
import {terrainHeight} from './terrain'
import {bearingBetween,roverBay,surveyBeacon} from './roverRoute'
import {createRoverSampler} from './roverSampling'

type Point = [number,number,number]
const wheelRadius = .47
const up = new T.Vector3(0,1,0)

export function createRover(){
 const vehicle = new T.Group()
 const fixtures = new T.Group()
 vehicle.name = 'Six-wheel expedition rover'
 const material = (color:number,metalness=.35,roughness=.62) =>
  new T.MeshStandardMaterial({color,metalness,roughness})
 const ivory = material(0xe5dbbd),slate = material(0x293136)
 const orange = material(0xc9602d),metal = material(0xa4aaa7,.7,.4)
 const gold = material(0xb49a53,.65,.48),tread = material(0x4c4941,.7,.8)
 const solar = material(0x172e49,.58,.3),lens = material(0x0b1b23,.65,.17)
 const lamp = new T.MeshBasicMaterial({color:0xffefce})
 const chassis = new Assembly()

 // A high-clearance equipment deck with chamfered corners and exposed hardware.
 const outline = new T.Shape()
 outline.moveTo(-.68,-1.24)
 outline.lineTo(.68,-1.24)
 outline.lineTo(.88,-1.04)
 outline.lineTo(.88,1.04)
 outline.lineTo(.68,1.24)
 outline.lineTo(-.68,1.24)
 outline.lineTo(-.88,1.04)
 outline.lineTo(-.88,-1.04)
 outline.closePath()
 chassis.add(new T.ExtrudeGeometry(outline,{depth:.11,bevelEnabled:true,bevelThickness:.025,bevelSize:.035,bevelSegments:1,steps:1}),
  ivory,[0,1.13,0],[-Math.PI/2,0,0])
 chassis.box(slate,[0,.89,0],[1.42,.30,1.94])
 chassis.box(gold,[0,1.055,0],[1.64,.14,2.1])
 for(const x of [-.83,.83]){
  chassis.box(metal,[x,.99,0],[.065,.11,2.05])
  for(const z of [-.91,-.35,.35,.91]){
   chassis.box(slate,[x,1.10,z],[.09,.09,.07])
   chassis.add(new T.CylinderGeometry(.026,.026,.025,6),metal,[x,1.275,z])
  }
 }
 // Front hazard cameras, tow points and a folded sampling arm.
 for(const x of [-.56,.56]){
  chassis.box(slate,[x,1.17,-1.25],[.27,.15,.11])
  chassis.add(new T.CylinderGeometry(.052,.052,.045,16),lens,[x,1.18,-1.32],[Math.PI/2,0,0])
  chassis.box(lamp,[x,.99,-1.07],[.12,.045,.025])
  chassis.add(new T.TorusGeometry(.07,.018,6,12),orange,[x,.88,-1.1])
 }
 const arm:Point[] = [[.62,.94,-.94],[.86,.68,-1.54],[-.15,.70,-1.55],[-.49,.45,-1.62]]
 const foldedArm=new Assembly()
 for(let i=0;i<arm.length-1;i++){
  foldedArm.rod(ivory,arm[i],arm[i+1],.075,10)
  foldedArm.add(new T.SphereGeometry(.11,12,8),metal,arm[i])
 }
 foldedArm.add(new T.CylinderGeometry(.14,.14,.20,12),slate,arm[3],[Math.PI/2,0,0])
 foldedArm.add(new T.CylinderGeometry(.047,.015,.19,10),metal,[-.49,.45,-1.80],[Math.PI/2,0,0])
 foldedArm.rod(slate,[.63,.99,-1.02],[.85,.77,-1.50],.025)
 foldedArm.rod(slate,[.85,.77,-1.50],[-.13,.79,-1.50],.025)
 const folded=foldedArm.finish();vehicle.add(folded)

 // Tall binocular mast and a separate communications dish.
 chassis.drum(slate,[-.49,1.29,-.75],.16,.18,.12)
 chassis.rod(ivory,[-.49,1.32,-.75],[-.49,2.58,-.75],.075,12)
 chassis.rod(slate,[-.40,1.31,-.73],[-.40,2.55,-.73],.022)
 chassis.box(orange,[-.49,2.50,-.75],[.20,.11,.20])
 chassis.box(ivory,[-.49,2.72,-.78],[.68,.28,.30])
 for(const x of [-.68,-.30]){
  chassis.add(new T.CylinderGeometry(.098,.098,.13,20),slate,[x,2.72,-.97],[Math.PI/2,0,0])
  chassis.add(new T.CylinderGeometry(.069,.069,.012,20),lens,[x,2.72,-1.045],[Math.PI/2,0,0])
 }
 chassis.box(ivory,[-.49,2.89,-.77],[.77,.04,.39])
 chassis.drum(metal,[.57,1.49,.78],.055,.055,.52)
 const dish = new Assembly()
 const profile = Array.from({length:13},(_,i)=>{
  const radius = .43*i/12
  return new T.Vector2(radius,radius*radius*.85)
 })
 const dishFinish = material(0xd3d0bb,.68,.4)
 dishFinish.side = T.DoubleSide
 dish.add(new T.LatheGeometry(profile,32),dishFinish,[0,0,0])
 dish.add(new T.TorusGeometry(.43,.012,6,32),metal,[0,.157,0],[Math.PI/2,0,0])
 dish.rod(slate,[0,0,0],[0,.34,0],.024)
 dish.drum(orange,[0,.35,0],.043,.043,.065)
 const antenna = dish.finish()
 antenna.position.set(.57,1.74,.78)
 antenna.rotation.x = -.55
 vehicle.add(antenna)
 chassis.rod(metal,[-.70,1.24,1.02],[-.70,2.42,1.02],.014)
 chassis.drum(orange,[-.70,2.43,1.02],.027,.027,.11)

 // Solar cells and a finned rear power unit stay visible from the driving camera.
 for(const side of [-1,1]){
  chassis.box(metal,[side*.65,1.32,.25],[.40,.045,1.10])
  for(let column=0;column<2;column++)for(let row=0;row<6;row++){
   chassis.box(solar,[side*.65-.092+column*.184,1.348,-.20+row*.18],[.17,.012,.16])
  }
 }
 chassis.box(slate,[0,1.35,1.16],[.70,.25,.54])
 for(let i=0;i<9;i++)chassis.box(metal,[-.32+i*.08,1.43,1.23],[.027,.40,.55])
 chassis.box(gold,[0,1.43,1.23],[.68,.24,.29])
 chassis.box(slate,[0,1.45,.25],[.63,.11,.57])
 chassis.box(slate,[0,1.70,.53],[.63,.49,.09])
 chassis.box(ivory,[0,1.72,.59],[.66,.51,.055])
 for(const side of [-1,1]){
  chassis.rod(metal,[side*.22,1.25,.25],[side*.22,1.40,.25],.04)
  chassis.rod(metal,[side*.40,1.28,.50],[side*.40,1.77,.50],.023)
  chassis.rod(metal,[side*.40,1.77,.50],[side*.40,1.77,-.26],.023)
  chassis.rod(slate,[side*.27,1.29,-.30],[side*.27,1.77,-.30],.03)
 }
 vehicle.add(chassis.finish())

 // The suited driver sits at the open controls when the player boards.
 const suit = new Assembly()
 const cloth = material(0xd59c62,.05,.91)
 const helmet = material(0xe8e1c8,.2,.55)
 suit.add(new T.SphereGeometry(1,16,12),cloth,[0,1.71,.20],[0,0,0],[.24,.32,.17])
 suit.box(ivory,[0,1.76,.39],[.36,.40,.15])
 suit.add(new T.SphereGeometry(.185,20,14),helmet,[0,2.13,.15])
 suit.add(new T.SphereGeometry(1,20,12),lens,[0,2.13,.017],[0,0,0],[.157,.128,.074])
 suit.box(ivory,[0,1.79,.038],[.19,.16,.035])
 for(const side of [-1,1]){
  suit.rod(cloth,[side*.23,1.87,.16],[side*.33,1.64,-.02],.075,10)
  suit.rod(helmet,[side*.33,1.64,-.02],[side*.27,1.61,-.30],.065,10)
  suit.rod(cloth,[side*.12,1.47,.16],[side*.17,1.42,-.28],.105,10)
  suit.rod(helmet,[side*.17,1.42,-.28],[side*.17,1.18,-.48],.08,10)
  suit.box(slate,[side*.17,1.16,-.57],[.17,.12,.27])
 }
 const driver = suit.finish()
 driver.name = 'Seated EVA operator'
 driver.position.y = .17
 driver.visible = false
 vehicle.add(driver)

 // Each wheel turns around its axle, inside a separate steering knuckle.
 const wheelParts = new Assembly()
 wheelParts.add(new T.CylinderGeometry(wheelRadius,wheelRadius,.32,32),tread,[0,0,0],[0,0,Math.PI/2])
 for(const side of [-1,1]){
  wheelParts.add(new T.CylinderGeometry(.37,.37,.025,28),slate,[side*.17,0,0],[0,0,Math.PI/2])
  wheelParts.add(new T.TorusGeometry(.385,.022,6,28),metal,[side*.186,0,0],[0,Math.PI/2,0])
  wheelParts.add(new T.CylinderGeometry(.13,.13,.065,16),gold,[side*.19,0,0],[0,0,Math.PI/2])
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3
   wheelParts.rod(metal,[side*.187,.11*Math.cos(angle),.11*Math.sin(angle)],
    [side*.187,.35*Math.cos(angle),.35*Math.sin(angle)],.024,6)
  }
 }
 for(let i=0;i<24;i++){
  const angle=i*Math.PI/12
  for(const side of [-1,1]){
   wheelParts.box(metal,[side*.078,.472*Math.cos(angle),.472*Math.sin(angle)],[.19,.032,.043],[angle,side*.30,0])
  }
 }
 const wheelModel = wheelParts.finish()
 const wheels = [-1,1].flatMap(side=>[-1.28,0,1.28].map(z=>{
  const steering = new T.Group()
  const spin = wheelModel.clone()
  steering.add(spin)
  steering.position.set(side*1.24,wheelRadius,z)
  vehicle.add(steering)
  return {side,z,steering,spin,ground:0}
 }))
 const direction = new T.Vector3()
 const linkGeometry = new T.CylinderGeometry(1,1,1,10)
 function link(radius:number,finish:T.Material){
  const part = new T.Mesh(linkGeometry,finish)
  part.castShadow = part.receiveShadow = true
  vehicle.add(part)
  return {part,radius}
 }
 function placeLink(segment:ReturnType<typeof link>,a:T.Vector3,b:T.Vector3){
  direction.subVectors(b,a)
  segment.part.position.copy(a).addScaledVector(direction,.5)
  segment.part.scale.set(segment.radius,direction.length(),segment.radius)
  segment.part.quaternion.setFromUnitVectors(up,direction.normalize())
 }
 const suspension = [-1,1].map(side=>{
  const joint = new T.Mesh(new T.CylinderGeometry(.12,.12,.18,16),gold)
  joint.rotation.z = Math.PI/2
  joint.castShadow = joint.receiveShadow = true
  vehicle.add(joint)
  return {side,joint,links:[link(.065,ivory),link(.065,ivory),link(.055,metal),link(.055,metal)],
   pivot:new T.Vector3(side*.92,.96,-.28),bogie:new T.Vector3()}
 })
 const beacons = new Assembly()
 for(const [site,color] of [[roverBay,0x89d6bc],[surveyBeacon,0xffb660]] as const){
  const y = terrainHeight(site.x,site.z)
  const glow = new T.MeshBasicMaterial({color,side:T.DoubleSide})
  const ring = new T.Mesh(new T.RingGeometry(2.85,3.08,48),glow)
  ring.position.set(site.x,y+.085,site.z)
  ring.rotation.x = -Math.PI/2
  fixtures.add(ring)
  for(const side of [-1,1]){
   const x=site.x+3.2*side,h=terrainHeight(x,site.z)
   beacons.box(slate,[x,h+.12,site.z],[.42,.24,.4])
   beacons.box(metal,[x,h+.86,site.z],[.065,1.55,.065])
   beacons.box(glow,[x+side*.24,h+1.58,site.z],[.52,.30,.035])
  }
 }
 fixtures.add(beacons.finish())
 const heading = bearingBetween(roverBay,surveyBeacon)
 const contact = new T.Vector3()
 let previousSteering=0,previousDriver=false
 function position(x:number,z:number,yaw:number,distance:number,steer=0){
  const changed=vehicle.position.x!==x||vehicle.position.z!==z||vehicle.rotation.y!==yaw||
   distance!==0||steer!==previousSteering||driver.visible!==previousDriver
  previousSteering=steer
  previousDriver=driver.visible
  const sin=Math.sin(yaw),cos=Math.cos(yaw)
  for(const wheel of wheels){
   const localX=wheel.side*1.24
   wheel.ground=terrainHeight(x+cos*localX+sin*wheel.z,z-sin*localX+cos*wheel.z)
  }
  const ground=wheels.reduce((sum,wheel)=>sum+wheel.ground,0)/wheels.length
  vehicle.position.set(x,ground,z)
  vehicle.rotation.order='YXZ'
  vehicle.rotation.set(
   Math.atan2(wheels[0].ground+wheels[3].ground-wheels[2].ground-wheels[5].ground,5.12),
   yaw,
   Math.atan2(wheels[3].ground+wheels[4].ground+wheels[5].ground-wheels[0].ground-wheels[1].ground-wheels[2].ground,7.44)
  )
  vehicle.updateMatrixWorld(true)
  for(const wheel of wheels){
   const localX=wheel.side*1.24
   contact.set(x+cos*localX+sin*wheel.z,wheel.ground+wheelRadius,z-sin*localX+cos*wheel.z)
   vehicle.worldToLocal(contact)
   wheel.steering.position.copy(contact)
   wheel.steering.rotation.y=-Math.sign(wheel.z)*steer*.40
   wheel.spin.rotation.x-=distance/wheelRadius
  }
  for(let i=0;i<suspension.length;i++){
   const {side,joint,links,pivot,bogie}=suspension[i]
   const front=wheels[i*3].steering.position,middle=wheels[i*3+1].steering.position,rear=wheels[i*3+2].steering.position
   bogie.copy(middle).add(rear).multiplyScalar(.5)
   bogie.x=side*1.10
   bogie.y+=.28
   joint.position.copy(bogie)
   placeLink(links[0],pivot,front)
   placeLink(links[1],pivot,bogie)
   placeLink(links[2],bogie,middle)
   placeLink(links[3],bogie,rear)
  }
  return changed
 }
 position(roverBay.x,roverBay.z,heading,0)
 const sampler=createRoverSampler(vehicle,fixtures,folded)
 return {vehicle,fixtures,position,heading,driver,sampler}
}
