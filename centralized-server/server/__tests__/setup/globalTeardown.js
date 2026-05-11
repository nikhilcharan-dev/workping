export default async function globalTeardown() {
  if (global.__MONGO_CONTAINER__) {
    await global.__MONGO_CONTAINER__.stop();
    console.log("[Integration] MongoDB container stopped");
  }
}
