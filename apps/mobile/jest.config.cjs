const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  setupFiles: [],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@tech-refresh/core/(.*)$": "<rootDir>/../../packages/core/src/$1.js",
  },
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "(^|/)\\._"],
  transformIgnorePatterns: expoPreset.transformIgnorePatterns,
};
