// @vitest-environment jsdom
import { expect, test, vi, beforeEach } from "vitest";
// NOTE: imported statically (rather than via `await import(...)` inside the
// test, as sketched in the task brief) because Vitest 4's Vite-based module
// runner resolves dynamic imports through `new URL(...)` internally
// (vite/dist/node/module-runner.js: posixPathToFileHref). If the global
// `URL` has already been stubbed (see beforeEach below) by the time the
// dynamic import executes, that resolution throws "URL is not a
// constructor". A static top-level import is resolved during collection,
// before any stub runs, sidestepping the issue entirely.
import { compressImage } from "./image-compression";

// jsdom doesn't implement canvas or Image decoding — mock just enough of
// the DOM surface compressImage touches to exercise the dimension math in
// isolation, independent of real image decoding.
class FakeImage {
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:fake"),
    revokeObjectURL: vi.fn(),
  });
});

test("clamping to minWidthOrHeight preserves aspect ratio instead of stretching", async () => {
  // Simulate a 4000x500 banner (8:1) needing to scale down to fit
  // maxWidthOrHeight=1920, then re-clamped so neither dimension drops below
  // minWidthOrHeight=800. Pre-fix: width/height are clamped independently,
  // producing 1920x800 (a 2.4:1 image squeezed from an 8:1 source). Post-fix
  // the SAME clamp must be applied uniformly to preserve the 8:1 ratio.
  const img = new FakeImage();
  img.width = 4000;
  img.height = 500;
  // NOTE: a `function` implementation (not an arrow function) is required
  // here — Vitest 4 invokes a spied constructor's mockImplementation via
  // real `new`, and `new (() => img)()` is a TypeError in plain JS.
  vi.spyOn(globalThis, "Image").mockImplementation(function () {
    return img;
  } as unknown as typeof Image);

  // canvas + toBlob are also not implemented in jsdom — stub the minimum.
  const fakeCtx = {
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    drawImage: vi.fn(),
  };
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => fakeCtx,
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x".repeat(100)])),
  };
  vi.spyOn(document, "createElement").mockReturnValue(fakeCanvas as unknown as HTMLCanvasElement);

  const file = new File(["x".repeat(2 * 1024 * 1024)], "banner.jpg", { type: "image/jpeg" });
  const result = await compressImage(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    minWidthOrHeight: 800,
  });

  const ratio = result.width / result.height;
  expect(ratio).toBeCloseTo(4000 / 500, 1); // 8:1, not stretched toward 2.4:1
});
