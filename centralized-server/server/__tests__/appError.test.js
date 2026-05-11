// Unit tests for utils/app.error.js
import { AppError } from "../utils/app.error.js";

describe("AppError", () => {
  it("is an Error subclass with name 'AppError'", () => {
    const err = new AppError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
    expect(err.message).toBe("boom");
  });

  it("defaults statusCode to 500 when not provided", () => {
    const err = new AppError("boom");
    expect(err.statusCode).toBe(500);
  });

  it("captures statusCode and code", () => {
    const err = new AppError("not found", 404, "RESOURCE_NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("marks isOperational as true (used by errorHandler)", () => {
    const err = new AppError("nope");
    expect(err.isOperational).toBe(true);
  });

  it("stores optional feature/upstream/cause metadata", () => {
    const cause = new Error("downstream timeout");
    const err = new AppError("svc down", 503, "UPSTREAM_DOWN", {
      feature: "attendance.check_in",
      upstream: "face-api",
      cause,
    });
    expect(err.feature).toBe("attendance.check_in");
    expect(err.upstream).toBe("face-api");
    expect(err.cause).toBe(cause);
  });

  it("strips the constructor frame from the captured stack", () => {
    const err = new AppError("boom");
    // The first stack frame should NOT mention 'AppError' constructor line
    expect(err.stack).toBeDefined();
    expect(err.stack.split("\n")[0]).toContain("AppError: boom");
  });
});
