// Shared scene definition. Units: 1 = poster width. Poster centre = (0,0). +x right, +y up, +z toward the viewer.
import * as THREE from 'three';

export const POSTER = { w: 1, h: 940 / 674 };   // poster_target.jpg aspect

// ---- EDIT HERE: 2D backgrounds placed around the poster -----------------------
export const PANELS = [
  { name: 'dragon',    img: 'assets/bg_dragon_strip.jpg',        w: 1.50, x: 0,     y: 1.28,  z: -0.05 }, // above
  { name: 'train',     img: 'assets/bg_train.jpg',               w: 1.50, x: 0,     y: -1.22, z: -0.05 }, // below
  { name: 'bathhouse', img: 'assets/bg_bathhouse.jpg',           w: 1.00, x: 1.08,  y: 0,     z: -0.05 }, // right
  { name: 'bridge',    img: 'assets/bg_bathhouse_chihiro.jpg',   w: 0.70, x: 2.00,  y: 0,     z: -0.10 }, // far right
  { name: 'hall',      img: 'assets/bg_hall.jpg',                w: 1.55, x: -1.30, y: 0,     z: -0.05 }, // left
];

// ---- EDIT HERE: characters (transparent PNG cut-outs) standing in front of panels ----
// h = height in poster-widths, z = distance in front of the panel (depth layering)
export const CHARACTERS = [
  // left: golden hall
  { name: 'kamaji',  img: 'assets/kamaji.png',      h: 0.62, x: -1.62, y: -0.10, z: 0.18 },
  { name: 'lin',     img: 'assets/lin.png',         h: 0.58, x: -1.15, y: -0.12, z: 0.26 },
  { name: 'haku',    img: 'assets/haku_human.png',  h: 0.55, x: -0.82, y: -0.16, z: 0.32 },
  { name: 'noface',  img: 'assets/noface.png',      h: 0.70, x: -1.30, y: 0.10,  z: 0.10 },
  // right: bathhouse (Yubaba in the middle)
  { name: 'yubaba',  img: 'assets/yubaba.png',      h: 0.40, x: 1.08,  y: -0.32, z: 0.22 },
  { name: 'oshira',  img: 'assets/oshira.png',      h: 0.42, x: 1.38,  y: -0.18, z: 0.16 },
  { name: 'boh',     img: 'assets/boh.png',         h: 0.22, x: 0.80,  y: -0.50, z: 0.34 },
  { name: 'chick',   img: 'assets/chick.png',       h: 0.26, x: 1.30,  y: -0.54, z: 0.36 },
  // far right: bridge
  { name: 'chihiro', img: 'assets/chihiro.png',     h: 0.70, x: 2.00,  y: -0.42, z: 0.22 },
  // TODO: haku-dragon cutout
];

const loader = new THREE.TextureLoader();
function tex(url) {
  return new Promise((res, rej) => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, rej));
}

export async function buildWorld(onProgress = () => {}) {
  const root = new THREE.Group();
  const billboards = [];
  const total = PANELS.length + CHARACTERS.length; let done = 0;

  // glowing outline around the real poster = visual "tracking locked" cue
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(POSTER.w + 0.05, POSTER.h + 0.05),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.55 }));
  frame.position.z = -0.004; root.add(frame);

  for (const p of PANELS) {
    const t = await tex(p.img);
    const h = p.w * t.image.height / t.image.width;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    m.position.set(p.x, p.y, p.z);
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(p.w + 0.03, h + 0.03), new THREE.MeshBasicMaterial({ color: 0x0d1b2a }));
    edge.position.set(p.x, p.y, p.z - 0.002);
    root.add(edge, m); onProgress(++done / total);
  }

  for (const c of CHARACTERS) {
    const t = await tex(c.img);
    const w = c.h * t.image.width / t.image.height;
    const g = new THREE.Group(); g.position.set(c.x, c.y, c.z);
    // soft contact shadow so they read as standing in the world
    const sh = document.createElement('canvas'); sh.width = sh.height = 64;
    const x = sh.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, w * 0.3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
    shadow.position.set(0, -c.h / 2 + 0.01, -0.01);
    const body = new THREE.Mesh(new THREE.PlaneGeometry(w, c.h),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.04, toneMapped: false }));
    g.add(shadow, body); root.add(g);
    billboards.push({ g, body, baseY: c.y, phase: Math.random() * 6.28 });
    onProgress(++done / total);
  }

  // per-frame: characters turn toward the viewer (limited yaw) + gentle idle float => reads as 3D while you move
  const v = new THREE.Vector3();
  function update(time, camera) {
    for (const b of billboards) {
      b.g.updateWorldMatrix(true, false);
      v.setFromMatrixPosition(b.g.matrixWorld);
      const local = b.g.parent.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
      const yaw = Math.atan2(local.x - b.g.position.x, Math.max(local.z - b.g.position.z, 0.2));
      b.body.rotation.y = THREE.MathUtils.clamp(yaw, -0.6, 0.6);
      b.g.position.y = b.baseY + Math.sin(time * 1.4 + b.phase) * 0.006;
    }
  }
  return { root, update };
}
