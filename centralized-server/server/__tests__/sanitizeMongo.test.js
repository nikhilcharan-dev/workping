// Unit tests for middleware/sanitizeMongo.js — strips $ and dot keys.
import sanitizeMongo from "../middleware/sanitizeMongo.js";

describe("sanitizeMongo middleware", () => {
  it("removes top-level $ keys from req.body", () => {
    const req = { body: { email: "a@b.com", $ne: null }, query: {}, params: {} };
    const next = jest.fn();
    sanitizeMongo(req, {}, next);
    expect(req.body).toEqual({ email: "a@b.com" });
    expect(next).toHaveBeenCalled();
  });

  it("removes nested $ keys recursively", () => {
    const req = {
      body: { filter: { name: "ok", $where: "this" } },
      query: {},
      params: {},
    };
    sanitizeMongo(req, {}, jest.fn());
    expect(req.body.filter).toEqual({ name: "ok" });
  });

  it("removes dot-notation keys", () => {
    const req = { body: { "user.password": "evil", name: "ok" }, query: {}, params: {} };
    sanitizeMongo(req, {}, jest.fn());
    expect(req.body).toEqual({ name: "ok" });
  });

  it("sanitizes req.query and req.params just like req.body", () => {
    const req = {
      body: {},
      query: { $gt: 5, page: 1 },
      params: { "a.b": "x", id: "y" },
    };
    sanitizeMongo(req, {}, jest.fn());
    expect(req.query).toEqual({ page: 1 });
    expect(req.params).toEqual({ id: "y" });
  });

  it("handles arrays of objects", () => {
    const req = {
      body: { tags: [{ name: "a", $regex: "x" }, { name: "b" }] },
      query: {},
      params: {},
    };
    sanitizeMongo(req, {}, jest.fn());
    expect(req.body.tags).toEqual([{ name: "a" }, { name: "b" }]);
  });

  it("leaves primitives and null untouched", () => {
    const req = { body: { n: 0, b: false, s: "", x: null }, query: {}, params: {} };
    sanitizeMongo(req, {}, jest.fn());
    expect(req.body).toEqual({ n: 0, b: false, s: "", x: null });
  });

  it("is a no-op when body/query/params are missing", () => {
    const req = {};
    const next = jest.fn();
    sanitizeMongo(req, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
