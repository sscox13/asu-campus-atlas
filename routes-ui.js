import * as THREE from 'three';
import {CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {createWalkingRouter} from './route-core.mjs';

export async function setupRoutes({scene,camera,controls,features,center,stage,status,planView}){
  const $=id=>document.getElementById(id),form=$('route-form'),from=$('route-from'),to=$('route-to'),submit=$('route-submit');
  const group=new THREE.Group();scene.add(group);
  const cleanup=()=>{for(const obj of [...group.children]){obj.traverse(child=>{child.geometry?.dispose();if(child.material){for(const m of [].concat(child.material))m.dispose();}child.element?.remove();});group.remove(obj);}};
  const routeError=message=>{$('route-error').textContent=message;$('route-error').hidden=!message;};
  function clear(){cleanup();$('route-result').hidden=true;$('route-map-summary').hidden=true;stage.classList.remove('route-active');$('route-summary-label').textContent='A → B';routeError('');$('route-osm-fallback').hidden=true;}
  const sorted=features.map((f,i)=>({f,i})).sort((a,b)=>a.f.label.localeCompare(b.f.label));
  const totals=new Map();for(const {f} of sorted)totals.set(f.label,(totals.get(f.label)||0)+1);const seen=new Map();
  for(const {f,i} of sorted){const count=(seen.get(f.label)||0)+1;seen.set(f.label,count);const text=f.label+(totals.get(f.label)>1?' · footprint '+count:'');for(const select of [from,to]){const option=document.createElement('option');option.value=String(i);option.textContent=text;select.append(option);}}
  from.value=String(features.findIndex(f=>f.label==='Hayden Library'));to.value=String(features.findIndex(f=>f.label==='Old Main'));
  let graph,findRoute;
  try{const response=await fetch('walking-graph.json');if(!response.ok)throw new Error();graph=await response.json();findRoute=createWalkingRouter(graph);submit.disabled=false;submit.textContent='Show walking route ↗';}
  catch{submit.textContent='Paths unavailable';routeError('Walking paths could not load. Refresh the page to try again.');return;}
  const world=p=>new THREE.Vector3(p[0]-center.x,2.9,-p[1]-center.z);
  function drawSegment(a,b,color,radius=.38){const start=world(a),end=world(b),length=start.distanceTo(end);if(length<.01)return;const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,8),new THREE.MeshStandardMaterial({color,roughness:.45,emissive:color,emissiveIntensity:.12}));mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());mesh.renderOrder=2;group.add(mesh);const joint=new THREE.Mesh(new THREE.SphereGeometry(radius,8,5),mesh.material.clone());joint.position.copy(start);group.add(joint);}
  function dashed(a,b){const geometry=new THREE.BufferGeometry().setFromPoints([world(a),world(b)]);const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0x8c4b48,dashSize:.6,gapSize:.4}));line.computeLineDistances();group.add(line);}
  function marker(p,letter){const element=document.createElement('div');element.className='route-pin '+(letter==='B'?'route-pin-end':'');element.textContent=letter;const label=new CSS2DObject(element);label.position.copy(world(p)).add(new THREE.Vector3(0,2,0));group.add(label);const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1.3,32),new THREE.MeshBasicMaterial({color:letter==='A'?0x244f53:0xb56349,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.copy(world(p));group.add(ring);}
  function latlon(p){return [33.422+p[1]/(.1*111320),-111.934+p[0]/(.1*111320*Math.cos(33.422*Math.PI/180))];}
  form.onsubmit=event=>{
    event.preventDefault();clear();
    if(from.value===''||to.value===''){routeError('Choose a start and destination.');return;}
    try{
      const start=Number(from.value),end=Number(to.value),route=findRoute(start,end),minutes=Math.max(1,Math.ceil(route.minutes));
      // The path itself follows graph edges; only access connectors are dashed.
      for(let i=2;i<route.points.length-1;i++)drawSegment(route.points[i-1],route.points[i],0x167b84);
      dashed(route.points[0],route.points[1]);dashed(route.points.at(-2),route.points.at(-1));marker(route.points[0],'A');marker(route.points.at(-1),'B');
      const distance=route.meters<1000?Math.round(route.meters)+' m':(route.meters/1000).toFixed(2)+' km';
      $('route-time').textContent=minutes+' min';$('route-distance').textContent=distance;$('route-map-time').textContent=minutes+' min · '+distance;
      $('route-map-names').textContent=features[start].label+' → '+features[end].label;$('route-summary-label').textContent=minutes+' min walk';
      $('route-steps').replaceChildren();for(const step of route.steps){const li=document.createElement('li');li.textContent=step.name+' · '+Math.round(step.meters)+' m';$('route-steps').append(li);}
      const a=latlon(route.access[0].point),b=latlon(route.access[1].point),url=new URL('https://www.openstreetmap.org/directions');url.searchParams.set('engine','fossgis_osrm_foot');url.searchParams.set('route',a.map(n=>n.toFixed(6)).join(',')+';'+b.map(n=>n.toFixed(6)).join(','));$('route-osm').href=url.toString();
      $('route-result').hidden=false;$('route-map-summary').hidden=false;stage.classList.add('route-active');planView();
      const box=new THREE.Box3().setFromPoints(route.points.map(world)),target=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());controls.target.set(target.x,0,target.z);camera.position.set(target.x,350,target.z+.001);
      const spanX=camera.right-camera.left,spanY=camera.top-camera.bottom;camera.zoom=Math.min(5,Math.max(.6,Math.min(spanX/(size.x+34),spanY/(size.z+65))));camera.updateProjectionMatrix();controls.update();
      status.textContent='A → B · '+minutes+' min walking · '+distance;
      if(matchMedia('(max-width:650px)').matches){$('route-panel').open=false;stage.scrollIntoView({behavior:'smooth',block:'start'});}
    }catch(error){routeError(error.message);status.textContent='Choose another start or destination';if(from.value!==''&&to.value!==''&&from.value!==to.value){const a=latlon(features[Number(from.value)].center),b=latlon(features[Number(to.value)].center),url=new URL('https://www.openstreetmap.org/directions');url.searchParams.set('engine','fossgis_osrm_foot');url.searchParams.set('route',a.join(',')+';'+b.join(','));$('route-osm-fallback').href=url.toString();$('route-osm-fallback').hidden=false;}}
  };
  $('route-swap').onclick=()=>{const value=from.value;from.value=to.value;to.value=value;clear();};
  from.onchange=clear;to.onchange=clear;$('route-clear').onclick=clear;
}
