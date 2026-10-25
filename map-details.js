import * as THREE from 'three';

export async function addMapDetails({scene,model,center,camera,stage,renderer}) {
  const data=await fetch('map-details.json').then(r=>{if(!r.ok)throw new Error('Map details unavailable');return r.json();});
  const group=new THREE.Group();scene.add(group);
  const materials={lawn:new THREE.MeshStandardMaterial({color:0x6a995d,roughness:1}),pitch:new THREE.MeshStandardMaterial({color:0x498b68,roughness:.96}),desert:new THREE.MeshStandardMaterial({color:0xb7a47a,roughness:1}),water:new THREE.MeshPhysicalMaterial({color:0x3caaa9,metalness:.25,roughness:.21,clearcoat:1}),road:new THREE.MeshStandardMaterial({color:0x8b8b7e,roughness:.96})};
  function surface(polygon,material,height){
    const shape=new THREE.Shape(polygon.outer.map(([x,y])=>new THREE.Vector2(x,y)));
    for(const ring of polygon.holes)shape.holes.push(new THREE.Path(ring.map(([x,y])=>new THREE.Vector2(x,y))));
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(-center.x,height,-center.z);mesh.receiveShadow=true;group.add(mesh);
  }
  for(const area of data.landscape)surface(area,materials[area.kind],2.425);
  const labels=[];
  const priority=['University Drive','Mill Avenue','Rural Road','Apache Boulevard'];
  const rank=name=>priority.includes(name)?priority.indexOf(name):99;
  data.streets.sort((a,b)=>rank(a.name)-rank(b.name)||b.length-a.length);
  for(const street of data.streets){
    for(const polygon of street.surfaces)surface(polygon,materials.road,2.665);
    // Warm lane dashes distinguish roads from the campus pedestrian network.
    for(const points of street.lines){
      const geometry=new THREE.BufferGeometry().setFromPoints(points.map(([x,y])=>new THREE.Vector3(x-center.x,2.68,-y-center.z)));
      const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0xf5e6b8,dashSize:.65,gapSize:.65,transparent:true,opacity:.65}));line.computeLineDistances();group.add(line);
    }
    // Transparent lettering lies on the street surface, with no DOM label box.
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    context.font='700 64px sans-serif';const textWidth=Math.ceil(context.measureText(street.name).width);
    canvas.width=textWidth+32;canvas.height=104;context.font='700 64px sans-serif';context.textAlign='center';context.textBaseline='middle';
    context.lineJoin='round';context.strokeStyle='rgba(37,55,42,.65)';context.lineWidth=3;context.strokeText(street.name,canvas.width/2,54);
    context.fillStyle='#fff9df';context.fillText(street.name,canvas.width/2,54);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const height=['University Drive','Mill Avenue','Rural Road','Apache Boulevard'].includes(street.name)?2.8:2.2,width=Math.min(canvas.width/canvas.height*height,street.length*.86);
    const lettering=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false}));
    const [a,b]=street.direction;let angle=Math.atan2(b[1]-a[1],b[0]-a[0]);if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;
    lettering.rotation.set(-Math.PI/2,0,angle);lettering.position.set(street.center[0]-center.x,2.72,-street.center[1]-center.z);lettering.renderOrder=3;scene.add(lettering);labels.push(lettering);
  }

  // Fine, restrained grass variation retains the corrected material color.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=211;
  for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const shade=238+(seed%18);pixels.data.set([shade,shade,shade,255],i);}ctx.putImageData(pixels,0,0);
  const grass=new THREE.CanvasTexture(canvas);grass.colorSpace=THREE.SRGBColorSpace;grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(48,48);grass.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  model.traverse(child=>{if(child.isMesh&&child.material.name==='ground-0'){
    const position=child.geometry.attributes.position,uv=[];
    for(let i=0;i<position.count;i++)uv.push(position.getX(i)/180,position.getY(i)/210);
    child.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));child.material.color.set(0x5d8d60);child.material.map=grass;child.material.needsUpdate=true;
  }});
  const toggle=document.getElementById('streets-toggle');
  toggle.addEventListener('change',()=>{for(const lettering of labels)lettering.visible=toggle.checked;});
  return ()=>{};
}
