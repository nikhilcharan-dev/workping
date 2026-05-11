/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {},
  verbose: true,
  // express + metrics ticker keep open handles past the last assertion.
  forceExit: true,
};
