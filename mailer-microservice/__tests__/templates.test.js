import templates from "../mail/templates.js";

describe("templates.getOtp", () => {
  const html = templates.getOtp("alice@example.com", "123456");

  it("embeds the OTP digits", () => {
    expect(html).toContain("123456");
  });

  it("uses the local part of the email as the recipient name (uppercased)", () => {
    expect(html).toContain("ALICE");
  });

  it("includes the default app name", () => {
    expect(html).toContain("WorkPing");
  });

  it("declares the default expiry of 30 minutes", () => {
    expect(html).toContain("30 minutes");
  });

  it("renders the current year in the footer", () => {
    expect(html).toContain(String(new Date().getFullYear()));
  });

  it("produces a complete HTML document", () => {
    expect(html).toMatch(/^\s*<!DOCTYPE html>/);
    expect(html).toContain("</html>");
  });

  it("escapes the email local part so a malicious local-part cannot inject HTML", () => {
    const out = templates.getOtp("<script>alert(1)</script>@x.com", "000000");
    expect(out).not.toContain("<script>alert(1)</script>");
  });
});

describe("templates.getResetPasswordOtp", () => {
  const html = templates.getResetPasswordOtp("bob@example.com", "987654");

  it("embeds the reset OTP", () => {
    expect(html).toContain("987654");
  });

  it("declares the shorter 10-minute expiry", () => {
    expect(html).toContain("10 minutes");
  });

  it("uses the warning accent (orange)", () => {
    expect(html).toContain("#d97706");
  });
});

describe("templates.getForgotPassword", () => {
  const link = "https://app.workping.live/reset?token=abc123";
  const html = templates.getForgotPassword("carol@example.com", link);

  it("embeds the reset link in the CTA", () => {
    expect(html).toContain(link);
  });

  it("renders the CTA button text", () => {
    expect(html).toContain("Reset Password");
  });
});

describe("templates.getGreeting", () => {
  const html = templates.getGreeting("Dave", "Acme Inc", "manager");

  it("uses the explicit name argument (not parsed from an email)", () => {
    expect(html).toContain("Dave");
  });

  it("embeds the organisation name", () => {
    expect(html).toContain("Acme Inc");
  });

  it("embeds the role", () => {
    expect(html).toContain("manager");
  });
});

describe("templates.getAlertInfo", () => {
  const html = templates.getAlertInfo("eve@example.com", "Server Reboot", "We will reboot at 02:00 UTC.");

  it("uses the supplied title", () => {
    expect(html).toContain("Server Reboot");
  });

  it("embeds the body message", () => {
    expect(html).toContain("We will reboot at 02:00 UTC.");
  });
});

describe("templates.getAlertWarning", () => {
  it("renders the action button when actionLink is provided", () => {
    const out = templates.getAlertWarning("u@x.com", "Disk full", "Free space soon", "https://x.com/clean");
    expect(out).toContain("https://x.com/clean");
    expect(out).toContain("Take Action");
  });

  it("omits the action button when actionLink is null", () => {
    const out = templates.getAlertWarning("u@x.com", "Disk full", "Free space soon", null);
    expect(out).not.toContain("Take Action");
  });
});

describe("templates.getAlertDanger", () => {
  it("uses the danger accent (red)", () => {
    const out = templates.getAlertDanger("u@x.com", "Breach", "Suspicious login", null);
    expect(out).toContain("#dc2626");
  });

  it("conditionally renders the resolve-now button", () => {
    const withLink = templates.getAlertDanger("u@x.com", "Breach", "Suspicious login", "https://x.com/lock");
    const withoutLink = templates.getAlertDanger("u@x.com", "Breach", "Suspicious login", null);
    expect(withLink).toContain("Resolve Now");
    expect(withoutLink).not.toContain("Resolve Now");
  });
});

describe("templates.getAlertSuccess", () => {
  it("uses the success accent (green)", () => {
    const out = templates.getAlertSuccess("u@x.com", "Backup OK", "Daily snapshot completed.");
    expect(out).toContain("#16a34a");
  });
});

describe("templates.getNotification", () => {
  it("falls back to a default title when omitted", () => {
    const out = templates.getNotification("u@x.com");
    expect(out).toContain("Notification");
  });

  it("respects an explicit title", () => {
    const out = templates.getNotification("u@x.com", "Pay Slip Available", "Your June slip is ready.");
    expect(out).toContain("Pay Slip Available");
    expect(out).toContain("Your June slip is ready.");
  });
});

describe("custom appName override", () => {
  it("propagates a custom appName into the OTP template", () => {
    const out = templates.getOtp("u@x.com", "111111", "Acme HR");
    expect(out).toContain("Acme HR");
  });
});
