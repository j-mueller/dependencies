// oxlint-disable-next-line import/no-unassigned-import -- installs DOM matchers globally for Vitest.
import "@testing-library/jest-dom/vitest";

class ResizeObserverMock implements ResizeObserver {
  readonly #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe(target: Element): void {
    const size = { blockSize: 768, inlineSize: 1024 };
    const entry: ResizeObserverEntry = {
      target,
      contentRect: new DOMRectReadOnly(0, 0, 1024, 768),
      borderBoxSize: [size],
      contentBoxSize: [size],
      devicePixelContentBoxSize: [size],
    };
    this.#callback([entry], this);
  }

  unobserve(): void {}

  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverMock;

Object.defineProperty(globalThis, "DOMMatrixReadOnly", {
  configurable: true,
  value: class DOMMatrixReadOnlyMock {
    readonly m22 = 1;
  },
});
