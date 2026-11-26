import * as THREE from 'three';
import { TextureFactory } from './TextureFactory.js';

const _tmpColor = new THREE.Color();

export function pushColoredBox(bucket, w, h, d, x, y, z, hex, rx = 0, ry = 0, rz = 0) {
  const geo = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geo.deleteAttribute('uv');
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);

  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  _tmpColor.setHex(hex);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = _tmpColor.r;
    colors[i * 3 + 1] = _tmpColor.g;
    colors[i * 3 + 2] = _tmpColor.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  bucket.push(geo);
}

export function pushGlassBox(bucket, w, h, d, x, y, z, ry = 0) {
  const geo = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geo.deleteAttribute('uv');
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  bucket.push(geo);
}

export function pushAtlasPlane(bucket, w, h, x, y, z, ry, atlasIndex, rx = 0, subRect = null) {
  const geo = new THREE.PlaneGeometry(w, h).toNonIndexed();
  const rect = TextureFactory.getAtlasUV(atlasIndex);

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
  // Standard PlaneGeometry non-indexed has 6 vertices (2 tris):
  // tri 1: top-left (0,1), bottom-left (0,0), top-right (1,1)
  // tri 2: bottom-left (0,0), bottom-right (1,0), top-right (1,1)
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, u < 0.5 ? u0 : u1, v < 0.5 ? v0 : v1);
  }
  uv.needsUpdate = true;

  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  bucket.push(geo);
}
