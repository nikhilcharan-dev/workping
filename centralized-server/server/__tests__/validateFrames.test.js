// Unit tests for middleware/validateFrames.js
import validateFrames from "../middleware/validateFrames.js";

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

describe("validateFrames middleware", () => {
  it("rejects when no files are attached", () => {
    const res = mockRes();
    const next = jest.fn();
    validateFrames({}, res, next);
    expect(res._status).toBe(400);
    expect(res._payload.message).toMatch(/minimum 2 frames required/i);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when only one frame is attached", () => {
    const res = mockRes();
    const next = jest.fn();
    validateFrames({ files: [{ mimetype: "image/jpeg" }] }, res, next);
    expect(res._status).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when any frame has a non-image mimetype", () => {
    const res = mockRes();
    const next = jest.fn();
    validateFrames(
      { files: [{ mimetype: "image/jpeg" }, { mimetype: "application/pdf" }] },
      res,
      next
    );
    expect(res._status).toBe(400);
    expect(res._payload.message).toMatch(/invalid file type/i);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when 2+ image files are present", () => {
    const res = mockRes();
    const next = jest.fn();
    validateFrames(
      { files: [{ mimetype: "image/jpeg" }, { mimetype: "image/png" }] },
      res,
      next
    );
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
