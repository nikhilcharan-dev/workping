/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {},
  verbose: true,
  // express + redis client + nodemailer keep open handles between tests.
  // forceExit is the pragmatic close — see app teardown in server.js.
  forceExit: true,
};
