import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const common = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Keep aliases and CSS handling
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },

  testPathIgnorePatterns: ["/node_modules/", "/.next/"],

  // Most transforms are handled by next/jest; no ts-jest preset needed
};

const appConfig = {
  displayName: "app",
  testEnvironment: "jsdom",
  testMatch: [
    "<rootDir>/__tests__/app/**/*.test.ts?(x)",
    "<rootDir>/__tests__/smoke.test.ts", // root smoke test
  ],
  ...common,
};

const clientConfig = {
  displayName: "client",
  testEnvironment: "jsdom",
  testMatch: [
    "<rootDir>/components/**/*.test.ts?(x)",
    "<rootDir>/__tests__/components/**/*.test.ts?(x)",
    "<rootDir>/__tests__/pages/**/*.test.ts?(x)",
  ],
  ...common,
};

const apiConfig = {
  displayName: "api",
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/api/**/*.test.ts?(x)"],
  setupFiles: ["<rootDir>/jest.setup.api-env.ts"], // injects fake env vars for API tests
  ...common,
};

const libConfig = {
  displayName: "lib",
  testEnvironment: "node", // good default for utilities/engines
  testMatch: ["<rootDir>/__tests__/lib/**/*.test.ts?(x)"],
  ...common,
};

export default async () => {
  const app = await createJestConfig(appConfig)();
  const client = await createJestConfig(clientConfig)();
  const api = await createJestConfig(apiConfig)();
  const lib = await createJestConfig(libConfig)();
  return {
    projects: [client, api, lib, app],
  };
};
