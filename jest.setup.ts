import "@testing-library/jest-dom";

beforeAll(() => {
  // Mock window.alert globally
  window.alert = jest.fn();
});
