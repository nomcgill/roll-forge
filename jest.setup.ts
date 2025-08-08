import "@testing-library/jest-dom";

beforeAll(() => {
  // Silence console.error noise
  jest.spyOn(console, "error").mockImplementation(() => {});

  // Ensure window.alert doesn’t throw in jsdom
  // (overwrite it directly to be safe across jsdom versions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).alert = jest.fn();
  if (typeof window !== "undefined") {
    // keep window.alert in sync
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).alert = global.alert;
  }
});

afterAll(() => {
  (console.error as jest.Mock | undefined)?.mockRestore?.();
});

afterEach(() => {
  jest.clearAllMocks();
});
