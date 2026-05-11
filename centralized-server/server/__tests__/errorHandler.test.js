// Unit tests for middleware/errorHandler.js
// The handler uses winston via utils/logger.js; we don't need to silence it for
// the assertions, but it'll print during the test run.
import errorHandler from "../middleware/errorHandler.js";
import { AppError } from "../utils/app.error.js";

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

function mockReq(overrides = {}) {
  return { method: "GET", path: "/x", ...overrides };
}

describe("errorHandler middleware", () => {
  it("returns the AppError statusCode and exposes the message (operational)", () => {
    const res = mockRes();
    const err = new AppError("Not found", 404, "X");
    errorHandler(err, mockReq(), res, jest.fn());
    expect(res._status).toBe(404);
    expect(res._payload).toEqual({ type: "error", message: "Not found" });
  });

  it("hides the message for non-operational errors (defaults to 500)", () => {
    const res = mockRes();
    const err = new TypeError("undefined.something");
    errorHandler(err, mockReq(), res, jest.fn());
    expect(res._status).toBe(500);
    expect(res._payload.message).toBe("Internal Server Error");
  });

  it("converts JSON SyntaxError into a 400 with a friendly message", () => {
    const res = mockRes();
    const err = new SyntaxError("Unexpected token in JSON at position 0");
    errorHandler(err, mockReq(), res, jest.fn());
    expect(res._status).toBe(400);
    expect(res._payload.message).toMatch(/invalid json payload/i);
  });

  it("uses 500 when statusCode is missing on an operational error", () => {
    const res = mockRes();
    const err = new Error("partial app error");
    err.isOperational = true;
    errorHandler(err, mockReq(), res, jest.fn());
    expect(res._status).toBe(500);
    expect(res._payload.message).toBe("partial app error");
  });
});
