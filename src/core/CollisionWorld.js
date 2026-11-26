// Zero-GC 2D Circle-vs-AABB collision resolver for smooth sliding around counters & terminal obstacles

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    // Playable world bounds (Emin Bufe + Tokat Terminal Hall)
    this.bounds = {
      minX: -22.5,
      maxX: 22.5,
      minZ: -6.7,
      maxZ: 22.6
    };
  }

  addBox(minX, minZ, maxX, maxZ, tag = '') {
    this.boxes.push({ minX, minZ, maxX, maxZ, tag });
  }

  addCenteredBox(cx, cz, width, depth, tag = '') {
    this.addBox(cx - width * 0.5, cz - depth * 0.5, cx + width * 0.5, cz + depth * 0.5, tag);
  }

  resolve(pos, radius = 0.34) {
    // World outer bounds
    if (pos.x < this.bounds.minX + radius) pos.x = this.bounds.minX + radius;
    if (pos.x > this.bounds.maxX - radius) pos.x = this.bounds.maxX - radius;
    if (pos.z < this.bounds.minZ + radius) pos.z = this.bounds.minZ + radius;
    if (pos.z > this.bounds.maxZ - radius) pos.z = this.bounds.maxZ - radius;

    // Resolve against each obstacle AABB (2 passes for crisp corners)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.boxes.length; i++) {
        const b = this.boxes[i];
        const closestX = pos.x < b.minX ? b.minX : pos.x > b.maxX ? b.maxX : pos.x;
        const closestZ = pos.z < b.minZ ? b.minZ : pos.z > b.maxZ ? b.maxZ : pos.z;

        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            pos.x += (dx / dist) * overlap;
            pos.z += (dz / dist) * overlap;
          } else {
            // Center inside AABB: push out along nearest edge
            const left = pos.x - b.minX;
            const right = b.maxX - pos.x;
            const front = pos.z - b.minZ;
            const back = b.maxZ - pos.z;
            const minPen = Math.min(left, right, front, back);
            if (minPen === left) pos.x = b.minX - radius;
            else if (minPen === right) pos.x = b.maxX + radius;
            else if (minPen === front) pos.z = b.minZ - radius;
            else pos.z = b.maxZ + radius;
          }
        }
      }
    }
  }
}
