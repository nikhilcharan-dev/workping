// Unit tests for utils/async.handler.js
import { asyncHandler } from "../utils/async.handler.js";

function mkReqRes() {
  const req = {};
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe("asyncHandler", () => {
  it("invokes the wrapped fn and does not call next on success", async () => {
    const { req, res, next } = mkReqRes();
    const handler = asyncHandler(async (_req, _res, _next) => {
      _res.ok = true;
    });
    await handler(req, res, next);
    expect(res.ok).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("passes thrown errors to next() with the feature tag attached", async () => {
    const { req, res, next } = mkReqRes();
    const handler = asyncHandler(async () => {
      throw new Error("oops");
    }, "user.profile.update");
    await handler(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.message).toBe("oops");
    expect(err.feature).toBe("user.profile.update");
  });

  it("preserves err.feature if the controller set it explicitly", async () => {
    const { req, res, next } = mkReqRes();
    const handler = asyncHandler(async () => {
      const e = new Error("nope");
      e.feature = "explicit.value";
      throw e;
    }, "default.feature");
    await handler(req, res, next);
    expect(next.mock.calls[0][0].feature).toBe("explicit.value");
  });

  it("normalises axios errors — rewrites statusCode/message/code from response", async () => {
    const { req, res, next } = mkReqRes();
    const axiosError = new Error("Request failed with status code 502");
    axiosError.isAxiosError = true;
    axiosError.response = {
      status: 502,
      data: { error: "Upstream unavailable", code: "FACE_DOWN" },
    };
    const handler = asyncHandler(async () => {
      throw axiosError;
    }, "face.detect");
    await handler(req, res, next);
    const fwd = next.mock.calls[0][0];
    expect(fwd.statusCode).toBe(502);
    expect(fwd.message).toBe("Upstream unavailable");
    expect(fwd.code).toBe("FACE_DOWN");
  });

  it("falls back to upstream data.message when data.error is absent", async () => {
    const { req, res, next } = mkReqRes();
    const axiosError = new Error("axios fail");
    axiosError.isAxiosError = true;
    axiosError.response = { status: 503, data: { message: "service unavailable" } };
    const handler = asyncHandler(async () => {
      throw axiosError;
    });
    await handler(req, res, next);
    const fwd = next.mock.calls[0][0];
    expect(fwd.message).toBe("service unavailable");
    expect(fwd.code).toBe("UPSTREAM_SERVICE_ERROR");
  });
});
