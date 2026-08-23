import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * A minimal render/query harness standing in for @testing-library/react and
 * `renderHook`, built on react-dom/client + React's own `act`.
 */

export interface RenderResult {
  container: HTMLElement;
  unmount: () => void;
}

export function renderElement(element: ReactElement): RenderResult {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(element);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function click(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

/** Finds the element whose own direct text (not combined with descendants) matches. */
export function findByOwnText(container: HTMLElement, text: string | RegExp): HTMLElement | null {
  const matches = (value: string) => (typeof text === "string" ? value.trim() === text : text.test(value));
  const candidates = container.querySelectorAll<HTMLElement>("*");
  for (const el of Array.from(candidates)) {
    const ownText = Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
    if (ownText && matches(ownText)) return el;
  }
  return null;
}

export async function waitFor(assertion: () => void, options?: { timeout?: number; interval?: number }): Promise<void> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 10;
  const start = Date.now();
  for (;;) {
    try {
      assertion();
      return;
    } catch (err) {
      if (Date.now() - start > timeout) throw err;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, interval));
      });
    }
  }
}

export function renderHook<T>(hookFn: () => T): { result: { current: T } } {
  let value: T;
  function Harness() {
    value = hookFn();
    return null;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(createElement(Harness));
  });
  return {
    result: {
      get current(): T {
        return value;
      },
    },
  };
}
