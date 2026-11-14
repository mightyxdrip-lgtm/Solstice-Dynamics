import * as T from 'three'
export function surfaceProps(){
 const group=new T.Group()
 const shell=new T.MeshStandardMaterial({color:0xd3baa0,metalness:.36,roughness:.62})
 const dark=new T.MeshStandardMaterial({color:0x343537,roughness:.65,metalness:.42})
 const orange=new T.MeshStandardMaterial({color:0xcb6634,roughness:.54})
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh
 }
 const text=(heading:string,sub:string,display=false)=>{
  const c=document.createElement('canvas');c.width=512;c.height=256
  const ctx=c.getContext('2d')!;ctx.fillStyle=display?'#081b20':'#d1c1a8';ctx.fillRect(0,0,512,256)
  ctx.fillStyle=display?'#7dd0bd':'#333026';ctx.font='bold 60px sans-serif';ctx.fillText(heading,20,96)
  ctx.font='29px monospace';ctx.fillText(sub,22,153);ctx.fillStyle='#d67541';ctx.fillRect(22,186,468,9)
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace
  return new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:display?0x6c7976:0x070707,roughness:.56})
 }
 const j=-5.55,k=3.9
 box(j,.47,k,.28,.94,.26,dark);box(j,1.20,k,.96,.70,.47,shell)
 box(j,1.54,k,.99,.095,.50,orange)
 for(const side of [-1,1]){
   const plate=box(j,1.28,k+side*.244,.84,.36,.02,text('J–2','STRING RELAYS',true))
   if(side<0)plate.rotation.y=Math.PI
   for(let i=0;i<3;i++){
     const lamp=box(j-.26+i*.26,1.02,k+side*.253,.105,.07,.026,new T.MeshBasicMaterial({color:0x83f2af}))
     if(i===1)lamp.name='relayLight'
   }
 }
 for(let channel=0;channel<2;channel++){
   const x=j-.15+channel*.30
   for(const off of [-.06,.10]){
      const collar=new T.Mesh(new T.CylinderGeometry(.044,.045,.038,channel?3:14),dark);collar.rotation.x=Math.PI/2;collar.position.set(x+off,1.13,k-.26);group.add(collar)
    }
   const path=new T.CatmullRomCurve3([new T.Vector3(x-.06,1.13,k-.25),new T.Vector3(x-.06,.93,k-.36),new T.Vector3(x+.095,.97,k-.38),new T.Vector3(x+.10,1.14,k-.25)])
   const jumper=new T.Mesh(new T.TubeGeometry(path,12,.024,6,false),channel?orange:dark);jumper.name='jumper'+channel;group.add(jumper)
 }
 const conduit=new T.CatmullRomCurve3([new T.Vector3(j,.35,k),new T.Vector3(-5.84,.07,4.15),new T.Vector3(-6.28,.052,4.51),new T.Vector3(-7.02,.055,4.77),new T.Vector3(-8.22,.24,5.86)])
 group.add(new T.Mesh(new T.TubeGeometry(conduit,24,.048,7,false),dark))
 const x=-5.55,z=7.35
 box(x,.07,z,.86,.14,.78,dark);box(x,.65,z,.27,1.25,.29,shell)
 box(x,1.36,z,1.04,.70,.25,orange)
 box(x,1.39,z+.134,.9,.52,.035,text('SOLAR 04','POWER BUS  /  E',true))
 box(x,1.39,z-.134,.9,.52,.035,text('SOLAR 04','ARRAY CONTROL',true)).rotation.y=Math.PI
 box(x,1.07,z+.2,.96,.1,.38,dark)
 box(12.5,.8,1,2.6,1.57,1.7,shell)
 for(const a of [-1,-.55,0,.55,1])box(12.5+a,.8,1,.09,1.65,1.74,dark)
 for(const a of [-.6,.6])box(12.5+a,1.78,1,.92,.40,1.25,orange)
 function portal(x:number,z:number,code:string,title:string){
  box(x-1.03,1.14,z,.18,2.28,.25,shell);box(x+1.03,1.14,z,.18,2.28,.25,shell)
  box(x,2.29,z,2.24,.32,.28,dark);box(x,1.12,z-.06,1.91,2.13,.15,shell)
  box(x,1.14,z+.03,.022,2.08,.05,dark)
  box(x,1.59,z+.048,.85,.31,.024,text(code,title))
  box(x+.48,.93,z+.056,.15,.27,.04,orange)
 }
 portal(8.55,-6.73,'H₂O 02','PROCESSING');portal(6,8.15,'AGR 03','GREENHOUSE')
 return group
}

