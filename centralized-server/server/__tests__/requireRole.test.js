// Unit tests for middleware/requireRole.js
import requireRole from "../middleware/requireRole.js";

function mockRes() {
  const res = {};
  res.status = jest.fn((c) => {
    res._status = c;
    return res;
  });
  res.json = jest.fn((p) => {
    res._payload = p;
    return res;
  });
  return res;
}

describe("requireRole middleware", () => {
  it("calls next() when req.user.role is one of the allowed roles", () => {
    const middleware = requireRole("admin", "manager");
    const req = { user: { role: "admin" } };
    const res = mockRes();
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when req.user is undefined", () => {
    const middleware = requireRole("admin");
    const res = mockRes();
    const next = jest.fn();
    middleware({}, res, next);
    expect(res._status).toBe(403);
    expect(res._payload).toEqual({ type: "error", message: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when req.user.role is not in the allowed list", () => {
    const middleware = requireRole("admin");
    const res = mockRes();
    const next = jest.fn();
    middleware({ user: { role: "employee" } }, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("supports any of multiple roles", () => {
    const middleware = requireRole("admin", "manager", "teamlead");
    const next = jest.fn();
    middleware({ user: { role: "teamlead" } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
