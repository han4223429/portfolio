import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import contentIndex from './content-index.json';

gsap.registerPlugin(ScrollTrigger);
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const sections = [
  ['01','콘텐츠','#content'],['02','기획','#plan'],['03','개발','#build'],['04','활동','#people']
];
const experience = [
  ['2026','Kalibrr 마케팅 인턴 · 필리핀 현지 근무 / ROTC 66기 / 또래멘토 / 갤럭시 대학생 서포터즈 6기'],
  ['2025','HIMS 개발팀 / 올담 모니터링단 / 제1회 올담 데이터 활용 해커톤 최우수상 / SCOUT 학생 창업동아리'],
  ['2024','순천향대학교 홍보대사 슈케터 / ICT AWARD KOREA 공식 서포터즈'],
  ['2022—23','삼성전자 갤럭시 고등리더 1기 우수활동자 · 3기'],
];
const External = ({href,children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true">↗</span></a>;
function Nav({paused,setPaused}) {
  const [menu,setMenu] = useState(false),[active,setActive]=useState('top'); const menuRef=useRef(null),panelRef=useRef(null);
  useEffect(()=>{if(!menu)return;panelRef.current?.querySelector('a')?.focus();const onKey=e=>{if(e.key==='Escape'){setMenu(false);menuRef.current?.focus()}};const onScroll=()=>setMenu(false);addEventListener('keydown',onKey);addEventListener('scroll',onScroll,{passive:true});return()=>{removeEventListener('keydown',onKey);removeEventListener('scroll',onScroll)}},[menu]);
  useEffect(()=>{let frame=0;const update=()=>{frame=0;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);document.documentElement.style.setProperty('--page-progress',`${Math.min(100,Math.max(0,scrollY/max*100))}%`);let current='top';for(const id of ['content','plan','build','people','contact']){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<innerHeight*.38)current=id}setActive(current)};const request=()=>{if(!frame)frame=requestAnimationFrame(update)};request();addEventListener('scroll',request,{passive:true});addEventListener('resize',request,{passive:true});return()=>{removeEventListener('scroll',request);removeEventListener('resize',request);if(frame)cancelAnimationFrame(frame)}},[]);
  return <><header className="nav"><a className="nav__brand" href="#top">김한용<span> / HANYONG KIM</span></a><div className="nav__right"><nav aria-label="주요 메뉴">{sections.map(([n,t,h])=><a key={n} href={h} aria-current={active===h.slice(1)?'location':undefined}><small>{n}</small>{t}</a>)}<a href="#contact" aria-current={active==='contact'?'location':undefined}>연락</a></nav><button className="motion-switch" type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'모션 켜기':'모션 끄기'}</button><button ref={menuRef} className="menu-switch" type="button" aria-expanded={menu} aria-controls="smallMenu" onClick={()=>setMenu(!menu)}>메뉴 <span aria-hidden="true">{menu?'×':'+'}</span></button></div></header><nav ref={panelRef} className="small-menu" id="smallMenu" hidden={!menu} aria-label="모바일 메뉴"><span className="small-menu__label">INDEX / HANYONG KIM</span>{sections.map(([n,t,h])=><a key={n} href={h} onClick={()=>setMenu(false)}><small>{n}</small>{t}<span aria-hidden="true">↗</span></a>)}<a href="#contact" onClick={()=>setMenu(false)}><small>05</small>연락<span aria-hidden="true">↗</span></a><p>콘텐츠 · 기획 · 개발 · 활동</p></nav></>
}
function Intro({paused,replayToken}){
  const [visible,setVisible]=useState(()=>!motionQuery.matches&&!location.hash&&(replayToken>0||!sessionStorage.getItem('hanyong-intro-seen')));
  useEffect(()=>{if(!visible)return;const done=()=>{sessionStorage.setItem('hanyong-intro-seen','1');setVisible(false)};const onScroll=()=>{if(scrollY>20)done()};const timer=setTimeout(done,2050);addEventListener('scroll',onScroll,{passive:true});return()=>{clearTimeout(timer);removeEventListener('scroll',onScroll)}},[visible]);
  useEffect(()=>{if(paused)setVisible(false)},[paused]);
  if(!visible)return null;
  return <div className="intro" aria-label="포트폴리오 인트로"><span className="intro__index">PORTFOLIO / 2026</span><div className="intro__center"><span>기획 · 개발 · 콘텐츠</span><strong>KIM<br/><em>HANYONG.</em></strong></div><button type="button" onClick={()=>{sessionStorage.setItem('hanyong-intro-seen','1');setVisible(false)}}>인트로 건너뛰기 <span aria-hidden="true">↗</span></button><span className="intro__foot">김한용 / HANYONG KIM</span></div>
}
function World({paused}) {
  const root=useRef(null),canvas=useRef(null);
  useEffect(()=>{
    const element=root.current, el=canvas.current; let live=true, renderer, scene, camera, ribbon, frame=0;
    const mobile=matchMedia('(max-width: 760px)').matches, reduced=motionQuery.matches;
    function render(){frame=0;if(!renderer||document.hidden||element.classList.contains('is-paused')||reduced)return;
      const max=Math.max(1,document.documentElement.scrollHeight-innerHeight), p=Math.min(1,Math.max(0,window.__showreelProgress ?? scrollY/max));
      element.style.opacity=String(Math.min(1,Math.max(0,(p-.045)*13)));
      const content=document.getElementById('content');
      const inGallery=content && scrollY>=content.offsetTop+innerHeight*.65 && scrollY<content.offsetTop+content.offsetHeight;
      element.style.opacity=inGallery?'0':String(Math.min(1,Math.max(0,(p-.045)*13)));
      const y=11-p*26.5;
      camera.position.set(.1,y,3.8);
      camera.lookAt(.35,y-.2,-3.8);
      ribbon.rotation.y=0;
      renderer.render(scene,camera);
      element.dataset.progress=p.toFixed(3);
    }
    function requestRender(){if(!frame&&renderer)frame=requestAnimationFrame(render)}
    function resize(){if(!renderer)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();requestRender()}
    addEventListener('scroll',requestRender,{passive:true});addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',requestRender);
    async function loadImage(path){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=path})}
    if(!mobile&&!reduced)import('three').then(async THREE=>{
      const [portrait,rescue]=await Promise.all([loadImage('images/profile.jpg'),loadImage('images/rescue-jet.jpg')]);if(!live)return;
      renderer=new THREE.WebGLRenderer({canvas:el,alpha:true,antialias:true,powerPreference:'low-power'});
      renderer.outputColorSpace=THREE.SRGBColorSpace;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);
      const surface=document.createElement('canvas');surface.width=1024;surface.height=4096;const c=surface.getContext('2d');
      function fill(y,h,color){c.fillStyle=color;c.fillRect(0,y,1024,h)}
      function cover(img,y,h){const ratio=Math.max(1024/img.width,h/img.height),w=img.width*ratio,hh=img.height*ratio;c.drawImage(img,(1024-w)/2,y+(h-hh)/2,w,hh)}
      function type(value,x,y,size,color='#263234',weight=700){c.fillStyle=color;c.font=`${weight} ${size}px DM Sans, Noto Sans KR, sans-serif`;c.fillText(value,x,y)}
      fill(0,4096,'#e8e2d7');cover(portrait,0,1030);fill(1030,780,'#263438');type('38',70,1560,410,'#ded8cc');type('29 REELS   /   09 CARDS',84,1690,55,'#f5efe5',600);
      fill(1810,700,'#eee8dc');type('DATA',72,2090,190);type('IDEA',72,2300,190);type('SERVICE',72,2480,110);
      fill(2510,1010,'#f1ece4');c.drawImage(rescue,0,130,819,501,0,2520,1024,990);fill(3520,576,'#d9d2c5');type('2022—2026',65,3790,123);type('HANYONG KIM',72,3960,80);
      c.strokeStyle='#fff';c.lineWidth=9;[1030,1810,2510,3520].forEach(y=>{c.beginPath();c.moveTo(0,y);c.lineTo(1024,y);c.stroke()});
      const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const geo=new THREE.PlaneGeometry(5.3,24,32,160);const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setXYZ(i,x+Math.sin(y*.32)*.7, y, -3+Math.cos(y*.37)*1.1+x*Math.sin(y*.25)*.16)}geo.computeVertexNormals();
      ribbon=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));ribbon.position.x=2.35;scene.add(ribbon);
      element.classList.add('ready');resize();requestRender();
    }).catch(()=>{if(live)element.classList.add('fallback')});
    return()=>{live=false;removeEventListener('scroll',requestRender);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',requestRender);if(frame)cancelAnimationFrame(frame);ribbon?.geometry.dispose();ribbon?.material.map.dispose();ribbon?.material.dispose();renderer?.dispose()};
  },[]);
  useEffect(()=>{root.current?.classList.toggle('is-paused',paused);if(!paused)dispatchEvent(new Event('scroll'))},[paused]);
  return <div ref={root} className="world" aria-hidden="true"><canvas ref={canvas}/></div>
}
function Hero({replayIntro,paused}){
  const root=useRef(null),surface=useRef(null);
  useEffect(()=>{if(paused||motionQuery.matches||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;const host=root.current,el=surface.current;let frame=0;
    const move=e=>{const r=host.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),y=Math.max(-1,Math.min(1,(e.clientY-r.top)/innerHeight*2-1));if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{el.style.transform=`perspective(900px) rotateX(${(-y*2.8).toFixed(2)}deg) rotateY(${(x*3.8).toFixed(2)}deg) translate3d(${(x*5).toFixed(1)}px,${(y*4).toFixed(1)}px,0)`;el.style.setProperty('--glow-x',`${50+x*24}%`);el.style.setProperty('--glow-y',`${50+y*24}%`);frame=0})};
    const reset=()=>{if(frame)cancelAnimationFrame(frame);frame=0;el.style.transform='';el.style.removeProperty('--glow-x');el.style.removeProperty('--glow-y')};
    host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',reset);return()=>{host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',reset);reset()};
  },[paused]);
  return <section ref={root} className="hero" id="top" aria-labelledby="heroTitle"><div className="hero__back" aria-hidden="true">HANYONG<br/>KIM</div><div className="hero__front"><p className="kicker motion-target">CONTENT · PLANNING · DEVELOPMENT</p><h1 id="heroTitle" className="motion-target">KIM<br/><em>HANYONG.</em></h1><p className="hero__line motion-target">코드와 콘텐츠를 만드는 김한용.<br/><small>순천향대학교 사물인터넷학과</small></p><div className="hero__actions"><a href="#content">작업 바로 보기 ↗</a><a href="#contact">연락 ↗</a></div></div><div className="hero__image motion-target"><div ref={surface} className="hero__tilt"><img src="images/profile.jpg" width="1067" height="1600" alt="김한용 인물 사진"/><span>김한용 / HANYONG KIM</span></div></div><nav className="hero__foot" aria-label="작업 바로 가기"><a href="#content"><small>01</small>콘텐츠 ↗</a><a href="#plan"><small>02</small>기획 ↗</a><a href="#build"><small>03</small>개발 ↗</a><button type="button" onClick={replayIntro}>인트로 다시 보기 ↺</button></nav></section>
}
const postHash=item=>`#post-${item.url.split('/').filter(Boolean).at(-1)}`;
const postFromHash=()=>contentIndex.find(item=>postHash(item)===location.hash);
function ContentCard({item,index,onOpen}) {
  const label=item.collection==='kalibrr'?'Kalibrr 참여 릴스':item.type==='reel'?'릴스':'카드뉴스';
  const title=item.collection==='kalibrr'?`Kalibrr 참여 릴스 ${item.date}`:`${item.date} ${label}`;
  return <article className="media-card">
    <div className="media-card__top"><span>{String(index+1).padStart(2,'0')} / {label}</span><span>INSTAGRAM</span></div>
    <div className="media-card__frame"><iframe key={item.url} title={`${title} Instagram 미리보기`} src={`${item.url}embed/`} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
    <div className="media-card__bottom"><div><h3>{title}</h3><p>{item.collection==='kalibrr'?'인턴십 참여 작업':'제작 콘텐츠'} · Instagram {item.type==='reel'?'Reel':'Post'}</p></div><div className="media-card__actions"><button type="button" onClick={e=>onOpen(item,e)} aria-label={`${title} 크게 보기`}>크게 보기 <span aria-hidden="true">＋</span></button><External href={item.url}>원본 보기</External></div></div>
  </article>
}
function Content(){
  const [filter,setFilter]=useState('all'),[page,setPage]=useState(0),[selectedUrl,setSelectedUrl]=useState(()=>postFromHash()?.url??null);
  const openerRef=useRef(null),closeRef=useRef(null),viewerRef=useRef(null),lastScrollRef=useRef(0);
  const filtered=contentIndex.filter(item=>filter==='all'||(filter==='kalibrr'?item.collection==='kalibrr':item.type===filter));
  const pageCount=Math.ceil(filtered.length/6);
  const shown=filtered.slice(page*6,page*6+6);
  const selected=contentIndex.find(item=>item.url===selectedUrl);
  const viewerItems=selected&&filtered.some(item=>item.url===selectedUrl)?filtered:contentIndex;
  const selectedIndex=viewerItems.findIndex(item=>item.url===selectedUrl);
  const changeFilter=key=>{setFilter(key);setPage(0)};
  const changePage=next=>{setPage(next);document.getElementById('contentGallery')?.scrollIntoView({behavior:motionQuery.matches?'instant':'smooth',block:'start'})};
  const openViewer=(item,e)=>{openerRef.current=e.currentTarget;lastScrollRef.current=scrollY;history.pushState({portfolioMedia:item.url},'',postHash(item));setSelectedUrl(item.url)};
  const selectViewer=item=>{history.replaceState({portfolioMedia:item.url},'',postHash(item));setSelectedUrl(item.url)};
  const closeViewer=()=>{if(history.state?.portfolioMedia){history.back();setSelectedUrl(null)}else{history.replaceState(null,'',location.pathname+location.search+'#content');setSelectedUrl(null);requestAnimationFrame(()=>document.getElementById('contentGallery')?.scrollIntoView({behavior:'instant',block:'start'}))}requestAnimationFrame(()=>(openerRef.current??document.querySelector('.content-filters button'))?.focus())};
  useEffect(()=>{const onPop=()=>{const post=postFromHash();setSelectedUrl(post?.url??null);if(!post){const top=lastScrollRef.current;lastScrollRef.current=0;requestAnimationFrame(()=>{if(top>0)scrollTo({top,behavior:'instant'});openerRef.current?.focus()})}};addEventListener('popstate',onPop);return()=>removeEventListener('popstate',onPop)},[]);
  useEffect(()=>{if(!selected)return;closeRef.current?.focus();const onKey=e=>{if(e.key==='Escape'){e.preventDefault();closeViewer()}else if(e.key==='Tab'){const nodes=[...viewerRef.current.querySelectorAll('button:not(:disabled),a[href],iframe')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};addEventListener('keydown',onKey);return()=>removeEventListener('keydown',onKey)},[selectedUrl]);
  return <section id="content" className="content chapter" aria-labelledby="contentTitle">
    <div className="section-label"><span>01 / CONTENT</span><span>보여주고, 전달하다</span></div>
    <div className="content__headline"><div><p className="eyebrow motion-target">만든 이야기와 참여한 작업</p><h2 id="contentTitle" className="kinetic motion-target"><span>38</span><small>PIECES</small></h2></div><p className="motion-target">순천향대학교 홍보대사 ‘슈케터’와 삼성 갤럭시 서포터즈에서 릴스와 카드뉴스를 기획·제작했습니다. Kalibrr 마케팅 인턴십에도 참여했습니다.</p></div>
    <div className="content__ruler" aria-label="기존 기록 수: 릴스 29편, 카드뉴스 9편"><div className="ruler__reels"><strong>29</strong><span>REELS</span></div><div className="ruler__cards"><strong>09</strong><span>CARDS</span></div></div>
    <p className="content__footnote">릴스 29편, 카드뉴스 9편. Kalibrr 인턴십 참여 릴스 9편을 포함한 기존 기록입니다.</p>
    <div id="contentGallery" className="content-gallery"><div className="works__heading"><span>CONTENT INDEX / 38 PIECES</span><span>형식별로 보기</span></div>
      <div className="content-filters" role="group" aria-label="콘텐츠 형식 필터">{[['all','전체',38],['reel','릴스',29],['card','카드뉴스',9],['kalibrr','Kalibrr 참여',9]].map(([key,label,count])=><button key={key} type="button" className={filter===key?'active':''} aria-pressed={filter===key} onClick={()=>changeFilter(key)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();changeFilter(key)}}}>{label}<small>{count}</small></button>)}</div>
      <div className="media-grid" aria-live="polite">{shown.map((item,i)=><ContentCard key={item.url} item={item} index={page*6+i} onOpen={openViewer}/>)}</div>
      <div className="gallery-pages"><span>{page+1} / {pageCount} · {filtered.length}편</span><div><button type="button" onClick={()=>changePage(page-1)} disabled={page===0} aria-label="이전 콘텐츠">← 이전</button><button type="button" onClick={()=>changePage(page+1)} disabled={page>=pageCount-1} aria-label="다음 콘텐츠">다음 →</button></div></div>
    </div><a className="text-link" href="archive.html#reels">기존 전체 기록 <span aria-hidden="true">↗</span></a>
    {selected&&createPortal(<div className="media-viewer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeViewer()}}><section ref={viewerRef} className="media-viewer" role="dialog" aria-modal="true" aria-labelledby="mediaViewerTitle"><div className="media-viewer__top"><span>CONTENT / {String(selectedIndex+1).padStart(2,'0')} OF {viewerItems.length}</span><button ref={closeRef} type="button" onClick={closeViewer} aria-label="콘텐츠 뷰어 닫기">닫기 <span aria-hidden="true">×</span></button></div><div className="media-viewer__body"><div className="media-viewer__info"><span className="eyebrow">{selected.collection==='kalibrr'?'KALIBRR · PARTICIPATED':selected.type==='reel'?'INSTAGRAM · REEL':'INSTAGRAM · CARD NEWS'}</span><h2 id="mediaViewerTitle">{selected.collection==='kalibrr'?'Kalibrr 참여 릴스':selected.type==='reel'?'릴스':'카드뉴스'}<br/><em>{selected.date}</em></h2><p>{selected.collection==='kalibrr'?'필리핀 Kalibrr 마케팅 인턴십에 참여한 릴스입니다.':selected.type==='reel'?'직접 제작한 릴스입니다.':'직접 제작한 카드뉴스입니다.'}</p><External href={selected.url}>Instagram 원본 열기</External></div><div className="media-viewer__embed"><iframe key={selected.url} src={`${selected.url}embed/`} title={`${selected.date} ${selected.type==='reel'?'릴스':'카드뉴스'} 크게 보기`} allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div></div><div className="media-viewer__nav"><button type="button" disabled={selectedIndex<=0} onClick={()=>selectViewer(viewerItems[selectedIndex-1])}>← 이전 작업</button><span>{String(selectedIndex+1).padStart(2,'0')} / {String(viewerItems.length).padStart(2,'0')}</span><button type="button" disabled={selectedIndex>=viewerItems.length-1} onClick={()=>selectViewer(viewerItems[selectedIndex+1])}>다음 작업 →</button></div></section></div>,document.body)}
  </section>
}
function People(){return <section id="people" className="people chapter" aria-labelledby="peopleTitle"><div className="section-label"><span>04 / PEOPLE</span><span>다른 자리, 같은 태도</span></div><div className="people__intro"><h2 id="peopleTitle" className="motion-target">하나의<br/><i>직함</i>보다<br/>여러 현장.</h2><p className="motion-target">학교 안팎에서 홍보, 멘토링, 인턴십, 개발팀 일을 경험했습니다. 무엇을 맡았는지 연도별로 정리했습니다.</p></div><div className="timeline">{experience.map(([year,line],i)=><div className="timeline__row motion-target" key={year}><span>{String(i+1).padStart(2,'0')}</span><strong>{year}</strong><p>{line}</p></div>)}</div><a className="text-link" href="archive.html#experience">전체 활동 기록 <span aria-hidden="true">↗</span></a></section>}
function Plan(){return <section id="plan" className="plan chapter" aria-labelledby="planTitle"><div className="section-label"><span>02 / PLANNING</span><span>올담 데이터 활용 해커톤</span></div><div className="plan__top"><p className="eyebrow motion-target">2025 / 충남 공공데이터 포털 올담</p><h2 id="planTitle" className="motion-target">DATA<span>→</span><br/>IDEA<span>→</span><br/>SERVICE</h2></div><div className="plan__grid"><p className="motion-target">개방 데이터를 탐색·분석하고 문제를 정의해, 실생활에 닿는 서비스 기획안을 발표했습니다.</p><ol><li className="motion-target"><b>01</b>데이터 탐색과 분석</li><li className="motion-target"><b>02</b>문제 정의</li><li className="motion-target"><b>03</b>서비스 기획과 발표</li></ol></div><div className="plan__result"><strong>제1회 해커톤 최우수상</strong><p>이후 올담 대학생 모니터링단 위원으로 활동했습니다.</p><a href="archive.html#workPlan">기획 과정 ↗</a></div></section>}
function Build(){return <section id="build" className="build chapter" aria-labelledby="buildTitle"><div className="section-label"><span>03 / BUILDING</span><span>화면에서 손으로</span></div><div className="build__lead"><p className="eyebrow motion-target">개발과 시제품</p><h2 id="buildTitle" className="motion-target">만들면,<br/><em>다르게 보인다.</em></h2></div><div className="build__rail"><article className="motion-target"><span>01 / DEVELOPMENT</span><h3>HIMS 개발팀</h3><p>2025년 하반기 근무. 기존 포트폴리오에 기록된 개발 실무 경험입니다.</p></article><article className="motion-target"><span>02 / PROTOTYPE</span><h3>RESCUE JET</h3><p>아두이노 제어 로직과 3D 프린팅 하우징을 결합한 자동 구명 추진 장치. 2025 제품제작역량 창업대회 최우수상.</p><small>3D 외형은 기존 설계 이미지를 바탕으로 재구성한 시각 자료입니다.</small><a href="archive.html#workBuild">프로젝트 기록 ↗</a></article></div><figure className="build__source"><img src="images/rescue-jet.jpg" width="819" height="631" loading="lazy" alt="RESCUE JET 설계 이미지"/><figcaption>RESCUE JET / ORIGINAL DESIGN IMAGE</figcaption></figure></section>}
function Outro(){return <footer id="contact"><div className="outro__top"><span>김한용 / HANYONG KIM</span><a href="#top">TOP ↑</a></div><p>다음 작업을<br/>함께 이야기해요.</p><a className="outro__mail" href="mailto:handak061@naver.com">연락 주세요<span aria-hidden="true">↗</span></a><a className="outro__address" href="mailto:handak061@naver.com">handak061@naver.com</a><div className="outro__bottom"><a href="archive.html">전체 기록 ↗</a><External href="https://github.com/han4223429">GitHub</External><span>© 2026 김한용</span></div></footer>}
function App(){
  const [paused,setPaused]=useState(motionQuery.matches),[introReplay,setIntroReplay]=useState(0);
  useEffect(()=>{if(!location.hash)return;const id=decodeURIComponent(location.hash.slice(1));requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'instant',block:'start'}))},[]);
  useEffect(()=>{document.documentElement.classList.toggle('motion-off',paused);ScrollTrigger.getAll().forEach(t=>paused?t.disable(false):t.enable());return()=>document.documentElement.classList.remove('motion-off')},[paused]);
  useLayoutEffect(()=>{
    if(motionQuery.matches||paused)return;
    document.documentElement.classList.add('reveal-ready');
    const targets=[...document.querySelectorAll('.chapter .motion-target,.timeline__row.motion-target')];
    targets.forEach((target,i)=>target.style.setProperty('--reveal-delay',`${Math.min(i%4,3)*65}ms`));
    const observer=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(isIntersecting){target.classList.add('is-shown');observer.unobserve(target)}})},{threshold:.08,rootMargin:'0px 0px -35px 0px'});
    targets.forEach(target=>observer.observe(target));
    return()=>{observer.disconnect();document.documentElement.classList.remove('reveal-ready')};
  },[paused]);
  useEffect(()=>{
    if(motionQuery.matches)return;
    const driver={value:0};
    const timeline=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:document.body,start:'top top',end:()=>`+=${Math.max(1,document.documentElement.scrollHeight-innerHeight)}`,scrub:.35,invalidateOnRefresh:true,onUpdate:self=>{window.__showreelProgress=self.progress;dispatchEvent(new Event('showreelprogress'))}}});
    timeline.to(driver,{value:1,duration:1},0);
    timeline.to('.hero__image',{yPercent:19,scale:.84,rotateY:-8,duration:.14},0)
      .to('.hero__back',{xPercent:-7,scale:1.2,duration:.14},0)
      .to('.hero__front',{yPercent:-18,opacity:0,duration:.13},.01);
    document.fonts.ready.then(()=>ScrollTrigger.refresh());
    return()=>{timeline.scrollTrigger?.kill();timeline.kill();delete window.__showreelProgress};
  },[]);
  return <><a className="skip" href="#content">본문으로 건너뛰기</a><Nav paused={paused} setPaused={setPaused}/><Intro key={introReplay} replayToken={introReplay} paused={paused}/><World paused={paused}/><main><Hero paused={paused} replayIntro={()=>{if(!paused&&!motionQuery.matches){scrollTo({top:0,behavior:'instant'});setIntroReplay(v=>v+1)}}}/><Content/><Plan/><Build/><People/></main><Outro/></>
}
createRoot(document.getElementById('app')).render(<App/>);
