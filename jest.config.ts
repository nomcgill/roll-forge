import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./", // path to your Next.js app
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Keep your aliases and CSS handling
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },

  testPathIgnorePatterns: ["/node_modules/", "/.next/"],

  // Most transforms are handled by next/jest; no ts-jest preset needed
};

export default createJestConfig(customJestConfig);
