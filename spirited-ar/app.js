import * as THREE from 'three';
import { buildWorld, POSTER } from './scene.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const show = (id, on = true) => $(id).classList.toggle('hidden', !on);
const MIND_URL = 'targets.mind';                       // optional pre-compiled target (see README)
const POSTER_IMG = 'assets/poster_target.jpg';
const COMPILER_JS = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';

function fail(msg) { show('loading', false); show('start', false); $('errMsg').textContent = msg; show('error'); }
const setMsg = m => ($('loadMsg').textContent = m);

// ---------- poster target: use targets.mind if present, otherwise compile in-browser (cached) ----------
async function getTargetURL() {
  try { const r = await fetch(MIND_URL, { method: 'HEAD' }); if (r.ok) return MIND_URL; } catch (e) {}
  const KEY = 'poster-mind-v1';
  const cached = await idbGet(KEY).catch(() => null);
  if (cached) return URL.createObjectURL(new Blob([cached]));
  setMsg('Learning the poster (first time only, ~20s)…');
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = COMPILER_JS; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const img = new Image(); img.src = POSTER_IMG; await img.decode();
  const compiler = new window.MINDAR.IMAGE.Compiler();
  await compiler.compileImageTargets([img], p => setMsg(`Learning the poster… ${Math.round(p)}%`));
  const buf = await compiler.exportData();
  idbSet(KEY, buf).catch(() => {});
  window.downloadMind = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf])); a.download = 'targets.mind'; a.click(); };
  return URL.createObjectURL(new Blob([buf]));
}
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('ar-cache', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = rej; }); }
async function idbGet(k) { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = rej; }); }
async function idbSet(k, v) { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('kv', 'readwrite').objectStore('kv').put(v, k); q.onsuccess = () => res(); q.onerror = rej; }); }

// ---------- AR mode ----------
async function startAR() {
  show('start', false); show('loading');
  if (!navigator.mediaDevices?.getUserMedia) return fail('Camera not available. Open this page over https:// in Safari/Chrome.');
  try {
    setMsg('Loading scene…');
    const world = await buildWorld(p => setMsg(`Loading scene… ${Math.round(p * 100)}%`));
    const imageTargetSrc = await getTargetURL();
    const { MindARThree } = await import('mindar-image-three');
    const mindar = new MindARThree({
      container: stage, imageTargetSrc, maxTrack: 1,
      filterMinCF: 0.0005, filterBeta: 300, missTolerance: 8, warmupTolerance: 4,
      uiLoading: 'no', uiScanning: 'no', uiError: 'no'
    });
    const { renderer, scene, camera } = mindar;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const anchor = mindar.addAnchor(0);
    // MindAR anchor: target width = 1, centred on the poster, y up.
    anchor.group.add(world.root);
    anchor.onTargetFound = () => show('hint', false);
    anchor.onTargetLost = () => { $('hint').textContent = 'Poster lost — point back at it'; show('hint'); };
    await mindar.start();
    show('loading', false); $('hint').textContent = 'Point the camera at the poster'; show('hint');
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => { world.update(clock.getElapsedTime(), camera); renderer.render(scene, camera); });
  } catch (e) {
    console.error(e);
    fail(/denied|NotAllowed/i.test(String(e)) ? 'Camera permission was denied. Allow it in your browser settings and retry.' : 'Could not start AR: ' + (e.message || e));
  }
}

// ---------- Preview mode (no camera): drag to orbit, pinch/scroll to zoom ----------
async function startPreview() {
  show('start', false); show('loading'); setMsg('Loading scene…');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d1b2a);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 50);
  const world = await buildWorld(); scene.add(world.root);
  // stand-in for the real poster
  const pt = await new THREE.TextureLoader().loadAsync(POSTER_IMG); pt.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(POSTER.w, POSTER.h), new THREE.MeshBasicMaterial({ map: pt })));
  let yaw = 0, pitch = 0, dist = 4.2, tx = 0, ty = 0; const pts = new Map(); let lastPinch = 0;
  const el = renderer.domElement; el.style.touchAction = 'none';
  el.onpointerdown = e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); };
  el.onpointerup = el.onpointercancel = e => { pts.delete(e.pointerId); lastPinch = 0; };
  el.onpointermove = e => {
    if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, e);
    if (pts.size === 1) {
      if (e.shiftKey || e.buttons === 2) { tx -= (e.clientX - prev.clientX) * 0.004; ty += (e.clientY - prev.clientY) * 0.004; }
      else { yaw -= (e.clientX - prev.clientX) * 0.005; pitch -= (e.clientY - prev.clientY) * 0.005; pitch = Math.max(-0.9, Math.min(0.9, pitch)); yaw = Math.max(-1.1, Math.min(1.1, yaw)); }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (lastPinch) dist = Math.max(1.5, Math.min(8, dist * lastPinch / d)); lastPinch = d;
    }
  };
  el.onwheel = e => { dist = Math.max(1.5, Math.min(8, dist * (1 + e.deltaY * 0.001))); };
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  show('loading', false); $('hint').textContent = 'Drag to look around · pinch to zoom'; show('hint');
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(tx, ty, 0); world.update(clock.getElapsedTime(), camera); renderer.render(scene, camera);
  });
}

$('btnStart').onclick = startAR;
$('btnPreview').onclick = startPreview;
const q = new URLSearchParams(location.search);
if (q.has('preview')) startPreview();
