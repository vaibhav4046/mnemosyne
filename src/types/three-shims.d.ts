// Minimal ambient types for the bits of three.js we touch directly in the galaxy
// (react-force-graph-3d owns the heavy lifting; we only add a bloom pass). Avoids
// pulling the full @types/three, which can drift from the bundled three version.
declare module "three" {
  export class Vector2 {
    constructor(x?: number, y?: number);
  }
  const THREE: { Vector2: typeof Vector2 } & Record<string, unknown>;
  export default THREE;
}

declare module "three/examples/jsm/postprocessing/UnrealBloomPass.js" {
  export class UnrealBloomPass {
    constructor(resolution: unknown, strength: number, radius: number, threshold: number);
    enabled: boolean;
  }
}
