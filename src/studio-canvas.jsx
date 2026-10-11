import React, { useEffect, useRef, useState } from 'react';

const studies = [
  { tag:'01 / PLAN', label:'기획', project:'올담 데이터 해커톤', href:'#plan', color:0x38bdf8 },
  { tag:'02 / BUILD', label:'개발', project:'RESCUE JET', href:'#build', color:0x7d9bff },
  { tag:'03 / SHARE', label:'콘텐츠', project:'릴스와 카드뉴스 38편', href:'#content', color:0xf0e7ca },
];

export default function StudioCanvas({paused}) {
  const [selected,setSelected]=useState(0),[status,setStatus]=useState('loading');
  const host=useRef(null),canvas=useRef(null),api=useRef(null),mode=useRef(0),stopped=useRef(paused);
  mode.current=selected;stopped.current=paused;
  useEffect(()=>{
    let live=true,renderer,scene,object,frame=0,visible=true,resizeObserver,observer,cleanupInput;
    const root=host.current,el=canvas.current,mobile=matchMedia('(max-width:760px)').matches;
    let rotation=0,targetX=0,targetY=0,drag=null,draws=0;
    const start=performance.now();
    const request=()=>{if(live&&renderer&&visible&&!document.hidden&&!frame)frame=requestAnimationFrame(draw)};
    let draw=()=>{};
    api.current={select:()=>request(),pause:()=>{if(frame)cancelAnimationFrame(frame);frame=0;request()},turn:step=>{rotation+=step;request()},reset:()=>{rotation=0;targetX=targetY=0;request()}};
    const onVisibility=()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0}else request()};
    document.addEventListener('visibilitychange',onVisibility);
    observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible){if(frame)cancelAnimationFrame(frame);frame=0}else request()},{threshold:.01});observer.observe(root);
    const onContextLost=e=>{e.preventDefault();if(frame)cancelAnimationFrame(frame);frame=0;renderer=null;if(live)setStatus('fallback')};
    el.addEventListener('webglcontextlost',onContextLost);
    import('three').then(THREE=>{
      if(!live)return;
      renderer=new THREE.WebGLRenderer({canvas:el,alpha:true,antialias:!mobile,powerPreference:'low-power'});
      renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.15:1.6));
      scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(38,1,.1,80);camera.position.set(3.3,1.4,7.9);camera.lookAt(0,0,0);
      object=new THREE.Group();scene.add(object);
      const slabGeometry=new THREE.BoxGeometry(3.3,3.35,.26);
      const slab=new THREE.Mesh(slabGeometry,new THREE.MeshStandardMaterial({color:0x101820,metalness:.72,roughness:.34}));object.add(slab);
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(slabGeometry),new THREE.LineBasicMaterial({color:0x9eaea9,transparent:true,opacity:.38}));object.add(edges);
      const inset=new THREE.Mesh(new THREE.PlaneGeometry(2.95,2.96),new THREE.MeshBasicMaterial({color:0x071014}));inset.position.z=.135;object.add(inset);
      const count=mobile?72:120,dummy=new THREE.Object3D(),barColor=new THREE.Color();
      const bars=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x163348,emissiveIntensity:.35,metalness:.2,roughness:.34}),count);bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);object.add(bars);
      const lineMaterial=new THREE.LineBasicMaterial({color:0x7d9bff,transparent:true,opacity:.4});
      const rules=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.43,-1.08,.18),new THREE.Vector3(1.43,-1.08,.18)]);object.add(new THREE.Line(rules,lineMaterial));
      const smallMarks=new THREE.Group();for(let i=0;i<8;i++){const mark=new THREE.Mesh(new THREE.BoxGeometry(.12,.012,.015),new THREE.MeshBasicMaterial({color:0xa1aea7}));mark.position.set(-1.38+i*.17,1.24,.18);smallMarks.add(mark)}object.add(smallMarks);
      const pointsCount=mobile?180:600,positions=new Float32Array(pointsCount*3);
      for(let i=0;i<pointsCount;i++){const a=i*2.39996323,r=2.2+(i%31)/31*1.65;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=(i/pointsCount-.5)*6.2;positions[i*3+2]=Math.sin(a)*r*.67-.9}
      const pointsGeo=new THREE.BufferGeometry();pointsGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
      const points=new THREE.Points(pointsGeo,new THREE.PointsMaterial({color:0x8abbb8,size:mobile?.018:.013,transparent:true,opacity:.52,depthWrite:false}));scene.add(points);
      const halo=new THREE.Mesh(new THREE.TorusGeometry(2.45,.009,5,100),new THREE.MeshBasicMaterial({color:0x49635f,transparent:true,opacity:.5}));halo.rotation.x=Math.PI/2;halo.position.y=-1.95;scene.add(halo);
      const grid=new THREE.GridHelper(9,24,0x294142,0x1c2b30);grid.position.y=-1.96;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
      scene.add(new THREE.HemisphereLight(0xedf4f2,0x152640,2.2));
      const key=new THREE.DirectionalLight(0xcbd6ff,4);key.position.set(5,5,7);scene.add(key);
      const rim=new THREE.PointLight(0x69e3d3,30,20);rim.position.set(-4,.5,3);scene.add(rim);
      const colorTargets=studies.map(item=>new THREE.Color(item.color)),white=new THREE.Color(0xffffff),palette=colorTargets[mode.current].clone();
      draw=()=>{
        frame=0;if(!live||!renderer||!visible||document.hidden)return;
        const quiet=stopped.current,t=quiet?0:(performance.now()-start)/1000,index=mode.current;
        palette.lerp(colorTargets[index],quiet?1:.09);
        const ease=quiet?1:.06;
        object.rotation.x+=(-.12+targetX*.13-object.rotation.x)*ease;
        object.rotation.y+=(-.28+rotation+targetY*.42+(index-1)*.13-object.rotation.y)*ease;
        object.rotation.z=(quiet?0:Math.sin(t*.35)*.025);
        object.position.y=quiet?0:Math.sin(t*.65)*.04;
        for(let i=0;i<count;i++){
          const u=i/(count-1),wave=Math.sin(u*12+t*(index===2?1.6:1.05)+index*.85)*.5+.5;
          const envelope=Math.sin(u*Math.PI);
          const h=.1+envelope*(.35+wave*(index===1?1.58:1.32));
          dummy.position.set((u-.5)*2.82,-1.025+h/2,.195);dummy.scale.set(2.82/count*.43,h,.068);dummy.updateMatrix();bars.setMatrixAt(i,dummy.matrix);
          barColor.copy(palette).lerp(white,Math.max(0,Math.sin(u*7+t*.25))*.22);bars.setColorAt(i,barColor);
        }
        bars.instanceMatrix.needsUpdate=true;bars.instanceColor.needsUpdate=true;
        points.rotation.y=quiet?0:t*.022;rim.color.copy(palette);renderer.render(scene,camera);
        draws++;if(draws%10===0||quiet){root.dataset.frames=String(draws);root.dataset.angle=object.rotation.y.toFixed(3)}
        if(!quiet)request();
      };
      const resize=()=>{if(!renderer)return;const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();request()};
      resizeObserver=new ResizeObserver(resize);resizeObserver.observe(root);resize();
      const move=e=>{if(stopped.current)return;const r=root.getBoundingClientRect();if(e.pointerType==='touch'){if(!drag)return;targetY=Math.max(-1,Math.min(1,(e.clientX-drag.x)/Math.max(100,r.width*.4)));targetX=0}else{targetY=(e.clientX-r.left)/r.width*2-1;targetX=(e.clientY-r.top)/r.height*2-1}root.dataset.pointer=`${targetY.toFixed(2)},${targetX.toFixed(2)}`;request()};
      const down=e=>{if(e.pointerType==='touch')drag={x:e.clientX,y:e.clientY}};
      const resetPointer=()=>{drag=null;targetX=targetY=0;root.dataset.pointer='0,0';request()};
      root.addEventListener('pointermove',move);root.addEventListener('pointerdown',down);root.addEventListener('pointerleave',resetPointer);root.addEventListener('pointerup',resetPointer);root.addEventListener('pointercancel',resetPointer);
      cleanupInput=()=>{root.removeEventListener('pointermove',move);root.removeEventListener('pointerdown',down);root.removeEventListener('pointerleave',resetPointer);root.removeEventListener('pointerup',resetPointer);root.removeEventListener('pointercancel',resetPointer)};
      setStatus('ready');request();
    }).catch(()=>{if(live)setStatus('fallback')});
    return()=>{live=false;if(frame)cancelAnimationFrame(frame);observer?.disconnect();resizeObserver?.disconnect();cleanupInput?.();document.removeEventListener('visibilitychange',onVisibility);el.removeEventListener('webglcontextlost',onContextLost);const geometries=new Set(),materials=new Set();scene?.traverse(x=>{if(x.geometry)geometries.add(x.geometry);if(x.material)materials.add(x.material)});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());renderer?.dispose();api.current=null};
  },[]);
  useEffect(()=>{api.current?.select()},[selected]);
  useEffect(()=>{api.current?.pause()},[paused]);
  const study=studies[selected];
  return <div className="spatial-shell" data-study={selected}>
    <div className="spatial-toolbar"><span><i aria-hidden="true"/>SYS.01 / FORM & FLOW</span><span>{status==='ready'?'WEBGL / INTERACTIVE':status==='fallback'?'STATIC / VIEW':'LOADING'}</span></div>
    <div className="spatial-stage" ref={host} data-renderer={status} data-motion={paused?'paused':'active'} tabIndex={status==='ready'?0:-1} role="group" aria-label="형태와 흐름을 탐색하는 3D 공간. 좌우 방향키로 회전할 수 있습니다." onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();api.current?.turn(e.key==='ArrowLeft'?-.3:.3)}if(e.key==='Home'){e.preventDefault();api.current?.reset()}}}>
      <div className="spatial-poster" aria-hidden="true"><div className="spatial-poster__slab"><div className="spatial-poster__bars">{Array.from({length:44},(_,i)=><i key={i} style={{height:`${12+Math.sin(i/43*Math.PI)*(24+(Math.sin(i*.4+selected)+1)*28)}%`}}/>)}</div></div><div className="spatial-poster__orbit"/></div>
      <canvas ref={canvas} aria-hidden="true"/>
      <div className="spatial-stage__note"><span>{status==='fallback'?'정적 공간':paused?'정지 화면':'마우스 · 드래그로 탐색'}</span><div><button type="button" disabled={status!=='ready'} onClick={()=>api.current?.turn(-.3)} aria-label="3D 공간 왼쪽으로 회전">←</button><button type="button" disabled={status!=='ready'} onClick={()=>api.current?.turn(.3)} aria-label="3D 공간 오른쪽으로 회전">→</button><button type="button" disabled={status!=='ready'} onClick={()=>api.current?.reset()} aria-label="3D 공간 원위치">↺</button></div></div>
    </div>
    <div className="spatial-tabs" role="group" aria-label="3D 공간의 작업 선택">{studies.map((item,i)=><button key={item.tag} type="button" aria-pressed={selected===i} onClick={()=>setSelected(i)}><small>0{i+1}</small>{item.label}<span aria-hidden="true">{selected===i?'●':'○'}</span></button>)}</div>
    <div className="spatial-caption" aria-live="polite"><span>{study.tag}</span><a href={study.href}>{study.project}<span aria-hidden="true">↗</span></a></div>
  </div>;
}
