/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {},
  verbose: true,
  // BullMQ + redis client + the webhook dedup setTimeout(5min) keep handles open.
  forceExit: true,
};
