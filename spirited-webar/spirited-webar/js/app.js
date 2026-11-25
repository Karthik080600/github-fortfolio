/* Spirited Away WebAR — poster-anchored world, gyro-locked, direction-driven audio */
const THREE = AFRAME.THREE, $ = id => document.getElementById(id);
const DEMO = new URLSearchParams(location.search).has('demo'); // no poster tracking: test scene + audio
const POSTER_H = 1.42;          // poster height in poster-widths (set to your poster's real ratio)
const VZ = 1.6;                 // assumed viewer distance from poster, in poster widths

/* ---------- ASSET CONFIG: drop transparent PNGs in assets/characters/ ---------- */
// side R = right, L = left. pos = [x, y, z] in poster space (x right, y up, z toward viewer), h = height
const CHARS = [
 {n:'yubaba',  s:'R', pos:[1.5,.1,VZ-.2],  h:.9},   // storyboard: Yubaba in the middle of the right group
 {n:'boh',     s:'R', pos:[1.2,-.1,VZ-.9], h:.6},
 {n:'chihiro', s:'R', pos:[1.9,.0,VZ+.5],  h:.7},
 {n:'lin',     s:'R', pos:[1.9,.1,VZ-.7],  h:.75},
 {n:'haku_human',s:'R',pos:[1.4,.0,VZ+.6], h:.7},
 {n:'noface',  s:'L', pos:[-1.6,.15,VZ-.3],h:.95},
 {n:'kamaji',  s:'L', pos:[-1.3,.0,VZ-1.0],h:.7},
];
const HAKU_DRAGON = 'haku_dragon';

/* ---------- helpers ---------- */
function cvsTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const glow=cvsTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,214,120,1)');r.addColorStop(1,'rgba(255,140,40,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
const cloudTex=cvsTex(256,128,(g)=>{for(let i=0;i<14;i++){const x=40+Math.random()*176,y=44+Math.random()*40,r=20+Math.random()*26,q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba(255,240,225,.55)');q.addColorStop(1,'rgba(255,240,225,0)');g.fillStyle=q;g.fillRect(0,0,256,128)}});
const waterTex=cvsTex(256,256,(g)=>{g.fillStyle='#1d4f86';g.fillRect(0,0,256,256);g.strokeStyle='rgba(200,230,255,.35)';for(let i=0;i<60;i++){const x=Math.random()*256,y=Math.random()*256;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+14,y-3,x+30,y);g.stroke()}});
waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping;waterTex.repeat.set(6,6);
const M=(c,o={})=>new THREE.MeshBasicMaterial(Object.assign({color:c},o));
const box=(w,h,d,c,x,y,z,p)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);p.add(m);return m};

/* ---------- WORLD ---------- */
const world=new THREE.Group(), anim=[];   // anim: fn(t,dt)
function buildBathhouse(){
 const g=new THREE.Group();g.position.set(0,.1,-3.5);g.scale.setScalar(1.5);
 const lights=[];
 for(let i=0;i<4;i++){const w=2.6-i*.35,y=i*.62;
  box(w,.55,1.1,0xb8392c,0,y+.28,0,g);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(w*.78,.32,4),M(0x2f8f6a));roof.rotation.y=Math.PI/4;roof.scale.z=.55;roof.position.set(0,y+.7,0);g.add(roof);
  for(let k=-2;k<=2;k++){if(Math.abs(k)*.5>w/2-.2)continue;const win=box(.22,.26,.02,0xffc863,k*.5,y+.3,.56,g);lights.push(win)}
  for(let k=0;k<5;k++){const l=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,blending:THREE.AdditiveBlending,depthWrite:false}));l.scale.setScalar(.34);l.position.set((k-2)*(w/5),y+.08,.62);g.add(l);lights.push(l)}}
 box(.9,.3,.9,0xf2b84b,0,2.6,0,g);
 anim.push((t)=>lights.forEach((l,i)=>{const f=.75+.25*Math.sin(t*3+i*1.7)*Math.sin(t*1.3+i);l.material.opacity=f;if(l.material.transparent!==true)l.material.transparent=true}));
 world.add(g);
}
function buildSky(){
 for(let i=0;i<9;i++){const c=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.2),M(0xffffff,{map:cloudTex,transparent:true,depthWrite:false}));
  c.position.set(-3+Math.random()*6,1.8+Math.random()*1.4,VZ-3+Math.random()*5);c.lookAt(0,0,VZ);const sp=.05+Math.random()*.08,x0=c.position.x;
  anim.push((t)=>{c.position.x=((x0+t*sp+4)%8)-4});world.add(c)}
 const N=160,pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*7;pos[i*3+1]=-1+Math.random()*4;pos[i*3+2]=VZ+(Math.random()-.5)*7}
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const pts=new THREE.Points(pg,new THREE.PointsMaterial({map:glow,size:.07,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
 anim.push((t)=>{const a=pg.attributes.position;for(let i=0;i<N;i++){a.array[i*3+1]+=.0015*(1+i%3);if(a.array[i*3+1]>3)a.array[i*3+1]=-1}a.needsUpdate=true});world.add(pts);
}
function buildTrain(){
 const g=new THREE.Group();g.position.set(0,-1.15,VZ);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(8,8),M(0xffffff,{map:waterTex,transparent:true,opacity:.82}));water.rotation.x=-Math.PI/2;water.position.y=-.05;g.add(water);
 anim.push((t)=>{waterTex.offset.set(t*.01,t*.02)});
 box(8,.02,.16,0x3a2a22,0,0,-.1,g);box(8,.02,.16,0x3a2a22,0,0,.1,g);          // rails
 for(let i=-16;i<16;i++)box(.06,.015,.34,0x5b4030,i*.25,-.01,0,g);             // sleepers
 const train=new THREE.Group();
 for(let c=0;c<2;c++){const cx=c*.62;box(.58,.22,.2,0x8c3a2a,cx,.15,0,train);box(.5,.07,.205,0xf2c36b,cx,.18,0,train)}
 train.position.y=0;g.add(train);
 anim.push((t)=>{train.position.x=((t*.35+4.5)%9.5)-5;trainX=train.position.x});
 world.add(g);
}
let trainX=0;
function loadCut(name,h,place){ // real PNG if present, labelled placeholder otherwise
 const mk=(map,ar,ph)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(h*ar,h),M(0xffffff,{map,transparent:true,side:THREE.DoubleSide,alphaTest:.02}));m.userData.ph=ph;place(m);};
 new THREE.TextureLoader().load(`assets/characters/${name}.png`,t=>{t.colorSpace=THREE.SRGBColorSpace;mk(t,t.image.width/t.image.height,false)},undefined,()=>{
  mk(cvsTex(256,384,(g,w,hh)=>{g.fillStyle='#ffffff22';g.fillRect(0,0,w,hh);g.strokeStyle='#f2b84b';g.setLineDash([10,8]);g.lineWidth=4;g.strokeRect(6,6,w-12,hh-12);g.fillStyle='#f6e9cf';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText('PLACEHOLDER',w/2,hh/2-10);g.fillText(name,w/2,hh/2+30)}),256/384,true)});
}
function buildChars(){
 CHARS.forEach((c,i)=>loadCut(c.n,c.h,m=>{m.position.set(...c.pos);m.lookAt(0,c.pos[1],VZ);const y0=c.pos[1];
  anim.push((t)=>{m.position.y=y0+Math.sin(t*1.2+i)*.015;if(c.s==='L')m.position.y=y0+Math.sin(t*.8+i)*.05;m.rotation.z=Math.sin(t*.9+i)*.02});world.add(m)}));
 loadCut(HAKU_DRAGON,.5,m=>{anim.push((t)=>{const u=(t*.06)%1;m.position.set(-3+6*u,2.1+Math.sin(u*9)*.25,VZ-1.2);m.lookAt(0,m.position.y,VZ);m.rotation.z=Math.sin(u*9)*.15;hakuX=m.position.x});world.add(m)});
}
let hakuX=9;
buildBathhouse();buildSky();buildTrain();buildChars();
$('world').setObject3D('w',world);
const sceneEl=$('scene');

/* ---------- POSE: tracked from poster, then gyro-locked when poster leaves view ---------- */
let tracked=false,lastPos=new THREE.Vector3(0,0,-VZ),lastQ=new THREE.Quaternion(),Qs=new THREE.Quaternion(),Qn=new THREE.Quaternion(),haveGyro=false,haveLock=false;
const e=new THREE.Euler(),q1=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)),q0=new THREE.Quaternion(),zz=new THREE.Vector3(0,0,1);
addEventListener('deviceorientation',ev=>{if(ev.alpha==null)return;haveGyro=true;
 const a=THREE.MathUtils.degToRad(ev.alpha),b=THREE.MathUtils.degToRad(ev.beta),g=THREE.MathUtils.degToRad(ev.gamma),o=THREE.MathUtils.degToRad(screen.orientation?screen.orientation.angle:(window.orientation||0));
 e.set(b,a,-g,'YXZ');Qn.setFromEuler(e).multiply(q1).multiply(q0.setFromAxisAngle(zz,-o));});
$('target').addEventListener('targetFound',()=>{tracked=true;setStatus('Poster found');$('msg').style.display='none'});
$('target').addEventListener('targetLost',()=>{tracked=false;setStatus(haveGyro?'Poster out of view — motion tracking':'Poster lost — point at poster')});
const tgt=$('target').object3D,tp=new THREE.Vector3(),tq=new THREE.Quaternion(),ts=new THREE.Vector3(),dq=new THREE.Quaternion(),look=new THREE.Vector3();
let zone='front';
function updatePose(){
 if(DEMO&&!haveLock){lastPos.set(0,-.2,-VZ);lastQ.identity();Qs.copy(Qn);haveLock=true;tracked=false}
 if(tracked){tgt.matrix.decompose(tp,tq,ts);lastPos.copy(tp);lastQ.copy(tq);Qs.copy(Qn);haveLock=true}
 if(!haveLock){world.visible=false;return}
 world.visible=true;
 if(tracked||!haveGyro){world.parent.position.copy(lastPos);world.parent.quaternion.copy(lastQ)}
 else{dq.copy(Qn).invert().multiply(Qs);world.parent.position.copy(lastPos).applyQuaternion(dq);world.parent.quaternion.copy(dq).multiply(lastQ)}
 world.parent.scale.setScalar(1);
 // viewing direction in poster space: camera looks down its -Z
 look.set(0,0,-1).applyQuaternion(world.parent.quaternion.clone().invert());
 if(!manual)setZone(look.y>.55?'up':look.y<-.55?'down':look.x>.5?'right':look.x<-.5?'left':'front');
}

/* ---------- AUDIO: 5 scene mixes with crossfade; real files if present, labelled synth placeholder otherwise ---------- */
let ctx,master,muted=false,vol=.8,manual=false,placeholder=false;
const FILES={front:'front_bathhouse',left:'left_spirits',right:'right_characters',down:'down_train_water',up:'up_sky_wind',train:'train_movement',water:'water_ambience',wind:'wind_ambience'};
const MIX={front:{front:1,water:.3,wind:.2},left:{left:1,wind:.35},right:{right:1,wind:.3},down:{down:1,water:.8,train:.7},up:{up:1,wind:.7}};
const layers={}; // name -> {gain}
function noiseBuf(sec=4){const b=ctx.createBuffer(1,ctx.sampleRate*sec,ctx.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}return b}
function synth(k){ // PLACEHOLDER ambience, not finished audio
 const o=ctx.createGain(),n=ctx.createBufferSource();n.buffer=noiseBuf();n.loop=true;const f=ctx.createBiquadFilter();
 const P={front:[520,.3,261.6],left:[300,.3,196],right:[700,.25,293.7],down:[900,.5,0],up:[1200,.4,329.6],train:[160,.5,0],water:[1400,.5,0],wind:[400,.6,0]}[k];
 f.type='bandpass';f.frequency.value=P[0];f.Q.value=.6;n.connect(f).connect(o);n.start();
 if(P[2]){const os=ctx.createOscillator(),og=ctx.createGain();os.type='sine';os.frequency.value=P[2];og.gain.value=.05;os.connect(og).connect(o);os.start()}
 const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.1+Math.random()*.15;lg.gain.value=P[0]*.3;lfo.connect(lg).connect(f.frequency);lfo.start();
 o.gain.value=0;return o}
async function loadLayer(k){
 try{const r=await fetch(`assets/audio/${FILES[k]}.mp3`);if(!r.ok)throw 0;const buf=await ctx.decodeAudioData(await r.arrayBuffer());
  const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;const g=ctx.createGain();g.gain.value=0;s.connect(g);s.start();return g}
 catch(_){placeholder=true;return synth(k)}}
async function initAudio(){
 ctx=new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();
 master=ctx.createGain();master.gain.value=vol;master.connect(ctx.destination);
 for(const k of Object.keys(FILES)){layers[k]=await loadLayer(k);layers[k].connect(master)}
 // train SFX swells as the train passes the viewer; Haku whoosh when he crosses overhead
 setInterval(()=>{if(!ctx)return;const w=MIX[zone]||{};const t=(w.train||0)*(1-Math.min(1,Math.abs(trainX)/4)*.6);layers.train.gain.setTargetAtTime(t*.9,ctx.currentTime,.3);
  if(zone==='up'&&Math.abs(hakuX)<.8)layers.wind.gain.setTargetAtTime(1,ctx.currentTime,.2)},200);
 applyMix();if(placeholder)setStatus('Placeholder audio — add mp3s to assets/audio');
}
function applyMix(){if(!ctx)return;const m=MIX[zone],t=ctx.currentTime;for(const k in layers)layers[k].gain.setTargetAtTime((m[k]||0)*.9,t,.7)}
let pending=null,pendT=0;
function setZone(z){if(z===zone){pending=null;return}if(pending!==z){pending=z;pendT=performance.now();return}
 if(performance.now()-pendT>300){zone=z;pending=null;applyMix();updZones()}}
$('vol').oninput=e=>{vol=+e.target.value;if(master&&!muted)master.gain.setTargetAtTime(vol,ctx.currentTime,.05)};
$('mute').onclick=()=>{muted=!muted;master&&master.gain.setTargetAtTime(muted?0:vol,ctx.currentTime,.1);$('mute').textContent=muted?'Unmute':'Mute'};

/* ---------- UI + fallback zone buttons (used if gyro is unavailable) ---------- */
function setStatus(s){$('status').textContent=s}
function updZones(){document.querySelectorAll('#zones button').forEach(b=>b.style.background=b.dataset.z===zone?'#f2b84b':'#0b133099',document.querySelectorAll('#zones button').forEach(b=>b.style.color=b.dataset.z===zone?'#0b1330':'#f6e9cf'))}
['left','front','right','up','down'].forEach(z=>{const b=document.createElement('button');b.textContent=z[0].toUpperCase()+z.slice(1);b.dataset.z=z;b.onclick=()=>{manual=true;zone=z;applyMix();updZones()};$('zones').appendChild(b)});
function fail(t){$('err').innerHTML='<div>'+t+'</div>';$('err').style.display='flex'}
$('go').onclick=async()=>{
 try{ if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')setStatus('Motion access denied')}
  await initAudio();
  $('intro').style.display='none';$('hud').style.display='flex';$('msg').style.display=DEMO?'none':'block';
  if(!DEMO){const sys=sceneEl.systems['mindar-image-system'];await sys.start()}
  setTimeout(()=>{if(!haveGyro){manual=true;$('zones').style.display='flex';updZones();setStatus('No motion sensor — use the zone buttons')}},1500);
 }catch(err){fail(err&&err.name==='NotAllowedError'?'Camera access was blocked. Allow the camera in your browser settings, then reload.':'Could not start: '+(err.message||err)+'<br><br>Check that assets/targets.mind exists and the page is served over HTTPS.')}};
$('reset').onclick=()=>{tracked=false;haveLock=false;manual=false;$('msg').style.display='block';setStatus('Point at the poster')};
$('exit').onclick=()=>{location.href=location.pathname};
sceneEl.addEventListener('renderstart',()=>{let last=0;sceneEl.renderer.setAnimationLoop(function(t){const s=t/1000;updatePose();anim.forEach(f=>f(s,s-last));last=s;sceneEl.renderer.render(sceneEl.object3D,sceneEl.camera)})});
