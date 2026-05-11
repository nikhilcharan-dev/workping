import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// In-memory Redis mock — replaces globalThis.redis for integration tests.
// Covers every Redis call in the auth flow:
//   bruteForce.js  → incr, expire, set, get, del
//   token.helper.js → set, get             (blacklist)
//   jwtBearer.js   → (via token.helper.js)
// ---------------------------------------------------------------------------
const _store = new Map();
const _exp = new Map();

function _live(key) {
  if (!_exp.has(key)) return true;
  if (_exp.get(key) > Date.now()) return true;
  _store.delete(key);
  _exp.delete(key);
  return false;
}

export const redisMock = {
  get: async (key) => (_live(key) ? (_store.get(key) ?? null) : null),
  set: async (key, val, opts = {}) => {
    _store.set(key, String(val));
    if (opts.EX) _exp.set(key, Date.now() + opts.EX * 1000);
    return "OK";
  },
  incr: async (key) => {
    if (!_live(key)) _store.delete(key);
    const n = parseInt(_store.get(key) ?? "0") + 1;
    _store.set(key, String(n));
    return n;
  },
  expire: async (key, secs) => {
    _exp.set(key, Date.now() + secs * 1000);
    return 1;
  },
  del: async (...keys) => {
    const flat = keys.flat();
    flat.forEach((k) => { _store.delete(k); _exp.delete(k); });
    return flat.length;
  },
  connect: async () => {},
};

// ---------------------------------------------------------------------------
// Lifecycle helpers used in test files
// ---------------------------------------------------------------------------

export async function connectTestDB() {
  // Install the mock before any request handler runs.
  globalThis.redis = redisMock;

  // Connect Mongoose to the container started in globalSetup.
  // The URI already contains replicaSet + directConnection options.
  await mongoose.connect(process.env.MONGO_TEST_URI);

  // Ensure unique indexes exist before tests that rely on them (e.g. duplicate-email → 409).
  await Promise.all(
    Object.values(mongoose.models).map((m) => m.createIndexes().catch(() => {}))
  );
}

export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export async function clearCollections() {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((col) => col.deleteMany({}))
  );
  // Reset the mock store so Redis state doesn't bleed between tests.
  _store.clear();
  _exp.clear();
}
