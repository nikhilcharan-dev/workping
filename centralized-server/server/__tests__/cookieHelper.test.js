// Unit tests for utils/cookie.helper.js
//
// The IS_PRODUCTION flag is evaluated at module-load time (top-level const), so
// we use jest.isolateModulesAsync to force a fresh import each time we want to
// flip MODE between tests.

describe("getCookieOptions", () => {
  afterEach(() => {
    delete process.env.MODE;
  });

  it("returns secure: false + sameSite: 'lax' outside production", async () => {
    process.env.MODE = "test";
    let opts;
    await jest.isolateModulesAsync(async () => {
      const { getCookieOptions } = await import("../utils/cookie.helper.js");
      opts = getCookieOptions({});
    });
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe("lax");
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(1000 * 60 * 60 * 24);
  });

  it("returns secure: true + sameSite: 'none' in production (cross-site)", async () => {
    process.env.MODE = "production";
    let opts;
    await jest.isolateModulesAsync(async () => {
      const { getCookieOptions } = await import("../utils/cookie.helper.js");
      opts = getCookieOptions({});
    });
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("none");
  });

  it("honors the httpOnly override", async () => {
    process.env.MODE = "test";
    let opts;
    await jest.isolateModulesAsync(async () => {
      const { getCookieOptions } = await import("../utils/cookie.helper.js");
      opts = getCookieOptions({}, { httpOnly: false });
    });
    expect(opts.httpOnly).toBe(false);
  });
});

describe("setAuthCookie / clearAuthCookie", () => {
  it("setAuthCookie writes 'accessToken' with derived options", async () => {
    process.env.MODE = "test";
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };
    await jest.isolateModulesAsync(async () => {
      const { setAuthCookie } = await import("../utils/cookie.helper.js");
      setAuthCookie(res, {}, "TOKEN");
    });
    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.cookie.mock.calls[0][0]).toBe("accessToken");
    expect(res.cookie.mock.calls[0][1]).toBe("TOKEN");
    expect(res.cookie.mock.calls[0][2]).toMatchObject({ httpOnly: true });
  });

  it("clearAuthCookie clears the 'accessToken' cookie", async () => {
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };
    await jest.isolateModulesAsync(async () => {
      const { clearAuthCookie } = await import("../utils/cookie.helper.js");
      clearAuthCookie(res, {});
    });
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
    expect(res.clearCookie.mock.calls[0][0]).toBe("accessToken");
  });
});
