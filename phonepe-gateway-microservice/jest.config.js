export default {
  transform: {},
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.js"],
  // Express-rate-limit + the redis reconnect strategy keep timers alive past the
  // last assertion. forceExit lets the suite exit cleanly without an explicit
  // afterAll teardown of every middleware.
  forceExit: true,
};
