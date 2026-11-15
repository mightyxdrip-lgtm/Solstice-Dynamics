import type {Camera,Vector3} from 'three'

export interface TaskSearch {key:string;seconds:number}
export const taskHintDelay = 45

export function updateTaskSearch(search:TaskSearch,key:string,seconds:number,searching:boolean,reached:boolean){
 if(search.key!==key||reached){
  search.key=key
  search.seconds=0
 }
 if(searching&&!reached)search.seconds+=seconds
 return searching&&search.seconds>=taskHintDelay
}

export function placeTaskHint(element:HTMLElement,point:Vector3,camera:Camera,width:number,height:number){
 camera.updateMatrixWorld()
 const view=point.clone().applyMatrix4(camera.matrixWorldInverse)
 const projected=point.clone().project(camera)
 const centerX=width/2,centerY=height/2
 const marginX=Math.min(48,width*.12)
 const top=Math.min(140,height*.25),bottom=height-Math.min(126,height*.22)
 const left=marginX,right=width-marginX
 let x=(projected.x+1)*centerX,y=(1-projected.y)*centerY
 const edge=view.z>=0||x<left||x>right||y<top||y>bottom
 let angle=0
 if(edge){
  let dx=x-centerX,dy=y-centerY
  // A target behind the camera needs a horizontal turn, even when looking up.
  if(view.z>=-.01){dx=view.x<0?-1:1;dy=0}
  const scaleX=Math.abs(dx)>.0001?(centerX-left)/Math.abs(dx):Infinity
  const scaleY=Math.abs(dy)>.0001?(dy<0?centerY-top:bottom-centerY)/Math.abs(dy):Infinity
  const scale=Math.min(scaleX,scaleY)
  x=centerX+dx*scale
  y=centerY+dy*scale
  angle=Math.atan2(dx,-dy)
 }
 element.classList.toggle('at-edge',edge)
 element.style.left=x+'px'
 element.style.top=y+'px'
 element.style.setProperty('--direction',angle+'rad')
}
