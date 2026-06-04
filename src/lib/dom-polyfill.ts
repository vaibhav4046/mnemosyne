/**
 * Minimal DOM-global polyfill so pdfjs-dist's legacy build loads under the
 * packaged Electron node runtime (which, unlike a fresh system Node, does not
 * expose DOMMatrix/DOMPoint/etc — pdfjs references them unguarded at module load
 * and throws "DOMMatrix is not defined"). Stubs are enough for getTextContent:
 * we never render to a canvas, only pull text, so the geometry classes just need
 * to exist and not crash.
 */
export function ensureDomPolyfill(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
      constructor(init?: number[] | string) {
        if (Array.isArray(init) && init.length >= 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
          this.m11 = this.a; this.m12 = this.b; this.m21 = this.c; this.m22 = this.d; this.m41 = this.e; this.m42 = this.f;
        }
      }
      multiplySelf() { return this; }
      preMultiplySelf() { return this; }
      translateSelf() { return this; }
      scaleSelf() { return this; }
      multiply() { return this; }
      translate() { return this; }
      scale() { return this; }
      inverse() { return this; }
    };
  }
  if (typeof g.DOMPoint === "undefined") {
    g.DOMPoint = class DOMPoint {
      x: number; y: number; z: number; w: number;
      constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
      matrixTransform() { return this; }
    };
  }
  if (typeof g.DOMRect === "undefined") {
    g.DOMRect = class DOMRect {
      x: number; y: number; width: number; height: number;
      constructor(x = 0, y = 0, width = 0, height = 0) { this.x = x; this.y = y; this.width = width; this.height = height; }
    };
  }
  if (typeof g.Path2D === "undefined") g.Path2D = class Path2D {};
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      width: number; height: number; data: Uint8ClampedArray;
      constructor(width: number, height: number) { this.width = width; this.height = height; this.data = new Uint8ClampedArray(Math.max(0, width * height * 4)); }
    };
  }
}
