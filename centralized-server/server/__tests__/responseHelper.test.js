// Unit tests for utils/response.helper.js
import { successResponse, errorResponse } from "../utils/response.helper.js";

function mockRes() {
  const res = {};
  res.status = jest.fn((code) => {
    res._status = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res._payload = payload;
    return res;
  });
  return res;
}

describe("successResponse", () => {
  it("defaults to status 200 and { type: 'success', message }", () => {
    const res = mockRes();
    successResponse(res, "ok");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res._payload).toEqual({ type: "success", message: "ok" });
  });

  it("includes data when provided", () => {
    const res = mockRes();
    successResponse(res, "created", { id: "abc" }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res._payload).toEqual({ type: "success", message: "created", data: { id: "abc" } });
  });

  it("omits data key when data is null (sentinel)", () => {
    const res = mockRes();
    successResponse(res, "ok", null);
    expect(res._payload).not.toHaveProperty("data");
  });

  it("includes data when value is falsy but not null (0, '', false)", () => {
    const res = mockRes();
    successResponse(res, "ok", 0);
    expect(res._payload.data).toBe(0);
  });
});

describe("errorResponse", () => {
  it("defaults to status 400 and { type: 'error', message }", () => {
    const res = mockRes();
    errorResponse(res, "bad request");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._payload).toEqual({ type: "error", message: "bad request" });
  });

  it("respects custom status code", () => {
    const res = mockRes();
    errorResponse(res, "not found", 404);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
