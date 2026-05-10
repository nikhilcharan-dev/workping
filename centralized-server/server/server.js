import "./globals.js";
import "dotenv/config";
import cluster from "cluster";
import http from "http";
import mongooseConfig from "./config/mongoose.js";

// Exponential backoff for worker restart — prevents thrash-looping on a crash
const backoff = (retries, base = 1000, cap = 30000) => Math.min(cap, base * Math.pow(2, retries));

/*
 * CLUSTER ARCHITECTURE
 * --------------------
 * Primary process only manages workers — it never runs Express or connects to DBs.
 * This prevents memory leaks and keeps the primary stable even if a worker crashes.
 *
 * Worker process runs the full app: Express, MongoDB, Redis, Socket.io.
 * Socket.io uses @socket.io/redis-adapter so io.to(room).emit() works across
 * all worker processes — without the adapter, only the worker holding that socket
 * would receive the emit.
 */
if (cluster.isPrimary) {
  let retries = 0;

  const spawnWorker = () => {
    const worker = cluster.fork();
    worker.on("online", () => {
      console.log(`[Cluster] Worker ${worker.process.pid} online`);
      retries = 0;
    });
    worker.on("exit", (code, signal) => {
      if (signal === "SIGTERM" || code === 0) return;
      const delay = backoff(retries++);
      console.warn(`[Cluster] Worker exited (${signal || code}), restarting in ${delay}ms`);
      setTimeout(spawnWorker, delay);
    });
  };

  spawnWorker();
} else {
  // Dynamic imports are deferred to the worker so the primary process
  // never imports app code (avoids double-initialization of globals).
  const { default: app } = await import("./app/app.js");
  const { default: socket } = await import("./app/socket.io.js");

  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);

  // Connect datastores before starting Socket.io — the Redis adapter
  // pub/sub clients are created inside socket() and need Redis to be up first.
  await mongooseConfig();
  await redis.connect();

  // Must await — socket adapter needs its own Redis pub/sub clients connected
  await socket(server);

  const { startRenewalCron } = await import("#services/subscription/renewal.cron.js");
  startRenewalCron();

  const { startShiftReminderCron } = await import("#services/shiftReminder/shiftReminder.cron.js");
  startShiftReminderCron();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}
