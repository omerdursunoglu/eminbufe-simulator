import * as THREE from 'three';
import { TextureFactory } from './TextureFactory.js';

const _tmpColor = new THREE.Color();

/**
 * Paints a BufferGeometry with vertex colors + optional vertical Ambient Occlusion gradient
 * (bottom vertices darkened cleanly at contact edges for free baked depth!).
 */
function paintAndPush(bucket, geo, x, y, z, hex, rx = 0, ry = 0, rz = 0, aoBottom = 1.0) {
  if (geo.index) geo = geo.toNonIndexed();
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);

  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  const maxY = geo.boundingBox.max.y;
  const spanY = Math.max(0.001, maxY - minY);

  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  _tmpColor.setHex(hex);

  for (let i = 0; i < count; i++) {
    let shade = 1.0;
    if (aoBottom < 0.999) {
      const t = (pos.getY(i) - minY) / spanY;
      shade = aoBottom + (1.0 - aoBottom) * Math.min(1, t * 1.45);
    }
    colors[i * 3] = _tmpColor.r * shade;
    colors[i * 3 + 1] = _tmpColor.g * shade;
    colors[i * 3 + 2] = _tmpColor.b * shade;
  }

  geo.translate(x, y, z);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  bucket.push(geo);
}

export function pushColoredBox(
  bucket,
  w,
  h,
  d,
  x,
  y,
  z,
  hex,
  rx = 0,
  ry = 0,
  rz = 0,
  aoBottom = 1.0
) {
  paintAndPush(bucket, new THREE.BoxGeometry(w, h, d), x, y, z, hex, rx, ry, rz, aoBottom);
}

export function pushColoredCylinder(
  bucket,
  rTop,
  rBot,
  h,
  segs,
  x,
  y,
  z,
  hex,
  rx = 0,
  ry = 0,
  rz = 0,
  aoBottom = 1.0
) {
  paintAndPush(
    bucket,
    new THREE.CylinderGeometry(rTop, rBot, h, segs),
    x,
    y,
    z,
    hex,
    rx,
    ry,
    rz,
    aoBottom
  );
}

export function pushColoredSphere(bucket, r, wSeg, hSeg, x, y, z, hex, sy = 1) {
  const geo = new THREE.SphereGeometry(r, wSeg, hSeg);
  if (sy !== 1) geo.scale(1, sy, 1);
  paintAndPush(bucket, geo, x, y, z, hex);
}

export function pushColoredTorus(
  bucket,
  r,
  tube,
  rSegs,
  tSegs,
  x,
  y,
  z,
  hex,
  rx = 0,
  ry = 0,
  rz = 0
) {
  paintAndPush(bucket, new THREE.TorusGeometry(r, tube, rSegs, tSegs), x, y, z, hex, rx, ry, rz);
}

export function pushGlassBox(bucket, w, h, d, x, y, z, ry = 0) {
  const geo = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geo.deleteAttribute('uv');
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  bucket.push(geo);
}

export function pushSignPlane(bucket, w, h, x, y, z, ry, signIndex, rx = 0, subRect = null) {
  const geo = new THREE.PlaneGeometry(w, h).toNonIndexed();
  remapUV(geo, signIndex, subRect);
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  bucket.push(geo);
}

export function pushSignBox(bucket, w, h, d, x, y, z, signIndex, ry = 0) {
  const geo = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  remapUV(geo, signIndex, null);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  bucket.push(geo);
}

function remapUV(geo, signIndex, subRect) {
  const rect = TextureFactory.getSignUV(signIndex);
  let u0 = rect.u0;
  let u1 = rect.u1;
  let v0 = rect.v0;
  let v1 = rect.v1;

  if (subRect) {
    const du = u1 - u0;
    const dv = v1 - v0;
    u0 = rect.u0 + subRect.u0 * du;
    u1 = rect.u0 + subRect.u1 * du;
    v0 = rect.v0 + subRect.v0 * dv;
    v1 = rect.v0 + subRect.v1 * dv;
  }

  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, u < 0.5 ? u0 : u1, v < 0.5 ? v0 : v1);
  }
  uv.needsUpdate = true;
}
