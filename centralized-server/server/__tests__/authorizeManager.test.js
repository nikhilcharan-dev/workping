// Unit tests for middleware/authorizeManager.js
import authorizeManager from "../middleware/authorizeManager.js";

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

describe("authorizeManager middleware", () => {
  it("returns 401 when req.user is missing", () => {
    const next = jest.fn();
    const res = mockRes();
    authorizeManager({}, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows admin without org scoping", () => {
    const next = jest.fn();
    const res = mockRes();
    authorizeManager(
      { user: { role: "admin" }, body: { organizationId: "anything" } },
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it("returns 403 when manager has no organizationId assigned", () => {
    const res = mockRes();
    const next = jest.fn();
    authorizeManager({ user: { role: "manager" } }, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when manager requests a different org via body", () => {
    const res = mockRes();
    const next = jest.fn();
    authorizeManager(
      {
        user: { role: "manager", organizationId: "OWN_ORG" },
        body: { organizationId: "OTHER_ORG" },
        query: {},
        params: {},
      },
      res,
      next
    );
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when manager requests a different org via query", () => {
    const res = mockRes();
    const next = jest.fn();
    authorizeManager(
      {
        user: { role: "manager", organizationId: "OWN_ORG" },
        body: {},
        query: { organizationId: "OTHER_ORG" },
        params: {},
      },
      res,
      next
    );
    expect(res._status).toBe(403);
  });

  it("returns 403 when manager requests a different org via params", () => {
    const res = mockRes();
    const next = jest.fn();
    authorizeManager(
      {
        user: { role: "manager", organizationId: "OWN_ORG" },
        body: {},
        query: {},
        params: { organizationId: "OTHER_ORG" },
      },
      res,
      next
    );
    expect(res._status).toBe(403);
  });

  it("attaches managedOrgId and calls next() for in-scope requests", () => {
    const req = {
      user: { role: "manager", organizationId: "OWN_ORG" },
      body: { organizationId: "OWN_ORG" },
      query: {},
      params: {},
    };
    const next = jest.fn();
    authorizeManager(req, mockRes(), next);
    expect(req.managedOrgId).toBe("OWN_ORG");
    expect(next).toHaveBeenCalled();
  });

  it("uses string equality so ObjectId vs string mismatch is rejected", () => {
    const req = {
      user: { role: "manager", organizationId: { toString: () => "abc" } },
      body: { organizationId: "xyz" },
      query: {},
      params: {},
    };
    const res = mockRes();
    const next = jest.fn();
    authorizeManager(req, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
