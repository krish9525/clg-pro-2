/**
 * Vitest + RTL global setup for frontend tests.
 */
import "@testing-library/jest-dom";

// Provide a functioning localStorage in jsdom so Zustand persist doesn't warn
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key)        => store[key] ?? null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { store = {}; },
    get length() { return Object.keys(store).length; },
    key:        (i)          => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { server } from "./mocks/server.js";

// Clean up the DOM between tests
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Start MSW mock server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Silence react-hot-toast in tests
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn() },
}));
