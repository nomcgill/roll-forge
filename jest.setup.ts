import "@testing-library/jest-dom";

// --- Top-level mocks (must be outside hooks) ---
const push = jest.fn();
const replace = jest.fn();
const refresh = jest.fn();
const back = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh, back }),
  usePathname: () => "/",
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
  }),
}));

// Make router fns accessible in tests if needed
// e.g. const { push } = (global as any).__NEXT_ROUTER_MOCK__;
(global as any).__NEXT_ROUTER_MOCK__ = { push, replace, refresh, back };

// --- Test lifecycle setup ---
beforeAll(() => {
  // Silence console.error noise in tests (remove if you want real errors visible)
  jest.spyOn(console, "error").mockImplementation(() => {});

  // Stable alert stub across jsdom versions/environments
  (global as any).alert = jest.fn();
  if (typeof window !== "undefined") {
    (window as any).alert = (global as any).alert;
  }
});

afterAll(() => {
  (console.error as jest.Mock | undefined)?.mockRestore?.();
});

afterEach(() => {
  jest.clearAllMocks();
});
// Reset global mocks after each test
