import mongoose from "mongoose";

const backoff = (retries, base = 1000, cap = 30000) => Math.min(cap, base * Math.pow(2, retries));

let retries = 0;

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
    });
    console.log("[MongoDB] Connected");
    retries = 0;
  } catch (err) {
    const delay = backoff(retries++);
    console.error(`[MongoDB] Connection failed, retrying in ${delay}ms`);
    setTimeout(connect, delay);
  }
};

mongoose.set("autoCreate", false);

mongoose.connection.on("disconnected", () => {
  const delay = backoff(retries++);
  console.warn(`[MongoDB] Disconnected, retrying in ${delay}ms`);
  setTimeout(connect, delay);
});

export default connect;
