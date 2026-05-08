import handlebars from "handlebars";

/* ─────────────────────────────────────────────
   DESIGN SYSTEM – Shared across all templates
   ───────────────────────────────────────────── */

const BRAND = {
    color: "#2563eb",
    colorDark: "#1e40af",
    colorLight: "#dbeafe",
    bg: "#f8fafc",
    cardBg: "#ffffff",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#e2e8f0",
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
    radius: "12px",
    font: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

/* ─── BASE LAYOUT ─── */

const baseLayout = (bodyContent, { accent = BRAND.color } = {}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>{{appName}}</title>
  <style>
    /* Reset */
    body, html { margin:0; padding:0; width:100%; }
    body {
      background: ${BRAND.bg};
      font-family: ${BRAND.font};
      color: ${BRAND.text};
      line-height: 1.6;
      -webkit-text-size-adjust: 100%;
    }
    img { border:0; display:block; }

    /* Container */
    .wrapper {
      width: 100%;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 560px;
      margin: 0 auto;
      background: ${BRAND.cardBg};
      border-radius: ${BRAND.radius};
      border: 1px solid ${BRAND.border};
      overflow: hidden;
    }

    /* Header Bar */
    .header-bar {
      height: 4px;
      background: ${accent};
    }

    /* Header */
    .header {
      padding: 32px 32px 0;
      text-align: center;
    }
    .header .logo-text {
      font-size: 22px;
      font-weight: 700;
      color: ${accent};
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 13px;
      color: ${BRAND.textMuted};
      margin-top: 4px;
    }

    /* Body */
    .body {
      padding: 32px;
    }
    .body h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 8px;
      color: ${BRAND.text};
    }
    .body p {
      font-size: 15px;
      color: ${BRAND.textMuted};
      margin: 0 0 16px;
    }

    /* OTP Box */
    .otp-box {
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      display: inline-block;
      padding: 16px 36px;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 10px;
      color: ${accent};
      background: ${BRAND.bg};
      border: 2px dashed ${accent};
      border-radius: 10px;
    }

    /* CTA Button */
    .cta-wrap { text-align: center; margin: 28px 0; }
    .cta-btn {
      display: inline-block;
      padding: 14px 36px;
      font-size: 15px;
      font-weight: 600;
      color: #ffffff !important;
      background: ${accent};
      border-radius: 8px;
      text-decoration: none;
      letter-spacing: 0.3px;
    }

    /* Info Box */
    .info-box {
      background: ${BRAND.bg};
      border-left: 4px solid ${accent};
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
      font-size: 13px;
      color: ${BRAND.textMuted};
    }

    /* Alert Variants */
    .alert-success { border-left-color: ${BRAND.success}; }
    .alert-warning { border-left-color: ${BRAND.warning}; }
    .alert-danger  { border-left-color: ${BRAND.danger}; }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid ${BRAND.border};
      margin: 24px 0;
    }

    /* Footer */
    .footer {
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: ${BRAND.textMuted};
      border-top: 1px solid ${BRAND.border};
    }
    .footer a { color: ${accent}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header-bar"></div>
      <div class="header">
        <div class="logo-text">{{appName}}</div>
      </div>
      ${bodyContent}
      <div class="footer">
        &copy; {{year}} {{appName}} &middot; All rights reserved.<br/>
        <span style="font-size:11px; color:#94a3b8;">This is an automated message. Please do not reply.</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

/* ───────────────────────────────────────
   1. OTP VERIFICATION
   ─────────────────────────────────────── */

const otpTemplate = handlebars.compile(
    baseLayout(`
  <div class="body">
    <h1>Verify Your Email</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>, use the code below to verify your email address.</p>
    <div class="otp-box">
      <div class="otp-code">{{otp}}</div>
    </div>
    <div class="info-box">
      ⏱ This code expires in <strong>{{expiry}}</strong>. Do not share it with anyone.
    </div>
    <p style="font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
`)
);

/* ───────────────────────────────────────
   2. RESET PASSWORD OTP
   ─────────────────────────────────────── */

const resetPasswordOtpTemplate = handlebars.compile(
    baseLayout(
        `
  <div class="body">
    <h1>Reset Your Password</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>, we received a request to reset your password. Use the OTP below to proceed.</p>
    <div class="otp-box">
      <div class="otp-code">{{otp}}</div>
    </div>
    <div class="info-box alert-warning">
      ⚠️ This code is valid for <strong>{{expiry}}</strong>. If you didn't request a password reset, please secure your account immediately.
    </div>
    <p style="font-size:13px;">Need help? Contact our support team.</p>
  </div>
`,
        { accent: BRAND.warning }
    )
);

const verifyPasswordTemplate = handlebars.compile(
    baseLayout(
        `
  <div class="body">
    <h1>Password Verified ✓</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>, your password has been successfully verified.</p>
    <div class="info-box alert-success">
      ✅ Your identity has been confirmed. You can now proceed with your action.
    </div>
    <p style="font-size:13px;">If this wasn't you, please reset your password immediately.</p>
  </div>
`,
        { accent: BRAND.success }
    )
);

const forgotPasswordTemplate = handlebars.compile(
    baseLayout(
        `
  <div class="body">
    <h1>Forgot Your Password?</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>, no worries — it happens! Click the button below to set a new password.</p>
    <div class="cta-wrap">
      <a href="{{resetLink}}" class="cta-btn">Reset Password →</a>
    </div>
    <div class="info-box alert-warning">
      ⏱ This link expires in <strong>{{expiry}}</strong>. If you didn't request this, ignore this email.
    </div>
    <p style="font-size:13px; word-break:break-all;">
      Or copy this link: <a href="{{resetLink}}" style="color:#2563eb;">{{resetLink}}</a>
    </p>
  </div>
`,
        { accent: BRAND.warning }
    )
);

const greetingTemplate = handlebars.compile(
    baseLayout(`
  <div class="body">
    <h1>Welcome Aboard! 🎉</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>, welcome to <strong>{{org}}</strong>!</p>
    <p>You've been added as <strong style="color:#2563eb;">{{role}}</strong>. We're excited to have you on the team.</p>
    <hr class="divider" />
    <p style="font-size:13px;">Get started by exploring your dashboard. If you need any help, our support team is here for you.</p>
  </div>
`)
);

const alertInfoTemplate = handlebars.compile(
    baseLayout(`
  <div class="body">
    <h1>📢 {{title}}</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>,</p>
    <p>{{message}}</p>
    <div class="info-box">
      ℹ️ This is an informational alert. No action is required.
    </div>
  </div>
`)
);

const alertWarningTemplate = handlebars.compile(
    baseLayout(
        `
  <div class="body">
    <h1>⚠️ {{title}}</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>,</p>
    <p>{{message}}</p>
    <div class="info-box alert-warning">
      ⚠️ Please review this and take action if necessary.
    </div>
    {{#if actionLink}}
    <div class="cta-wrap">
      <a href="{{actionLink}}" class="cta-btn" style="background:#d97706;">Take Action →</a>
    </div>
    {{/if}}
  </div>
`,
        { accent: BRAND.warning }
    )
);

const alertDangerTemplate = handlebars.compile(
    baseLayout(
        `
  <div class="body">
    <h1>🚨 {{title}}</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>,</p>
    <p>{{message}}</p>
    <div class="info-box alert-danger">
      🚨 Immediate action is required. Please resolve this as soon as possible.
    </div>
    {{#if actionLink}}
    <div class="cta-wrap">
      <a href="{{actionLink}}" class="cta-btn" style="background:#dc2626;">Resolve Now →</a>
    </div>
    {{/if}}
  </div>
`,
        { accent: BRAND.danger }
    )
);

const alertSuccessTemplate = handlebars.compile(
    baseLayout(
        `
  <div class="body">
    <h1>✅ {{title}}</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>,</p>
    <p>{{message}}</p>
    <div class="info-box alert-success">
      ✅ Everything looks good. No further action is needed.
    </div>
  </div>
`,
        { accent: BRAND.success }
    )
);

const notificationTemplate = handlebars.compile(
    baseLayout(`
  <div class="body">
    <h1>{{title}}</h1>
    <p>Hi <strong style="color:#1e293b">{{name}}</strong>,</p>
    <p>{{message}}</p>
    <hr class="divider" />
    <p style="font-size:13px;">If you have questions, feel free to reach out to our support team.</p>
  </div>
`)
);

/* ═══════════════════════════════════════
   EXPORT HELPERS
   ═══════════════════════════════════════ */

const currentYear = new Date().getFullYear();

const getOtp = (email, otp, appName = "WorkPing", expiry = "30 minutes") => {
    const name = email.split("@")[0].toUpperCase();
    return otpTemplate({ name, otp, appName, expiry, year: currentYear });
};

const getResetPasswordOtp = (email, otp, appName = "WorkPing", expiry = "10 minutes") => {
    const name = email.split("@")[0].toUpperCase();
    return resetPasswordOtpTemplate({ name, otp, appName, expiry, year: currentYear });
};

const getVerifyPassword = (email, appName = "WorkPing") => {
    const name = email.split("@")[0].toUpperCase();
    return verifyPasswordTemplate({ name, appName, year: currentYear });
};

const getForgotPassword = (email, resetLink, appName = "WorkPing", expiry = "1 hour") => {
    const name = email.split("@")[0].toUpperCase();
    return forgotPasswordTemplate({ name, resetLink, appName, expiry, year: currentYear });
};

const getGreeting = (name, org, role, appName = "WorkPing") =>
    greetingTemplate({ name, org, role, appName, year: currentYear });

const getAlertInfo = (email, title, message, appName = "WorkPing") => {
    const name = email.split("@")[0].toUpperCase();
    return alertInfoTemplate({ name, title, message, appName, year: currentYear });
};

const getAlertWarning = (email, title, message, actionLink = null, appName = "WorkPing") => {
    const name = email.split("@")[0].toUpperCase();
    return alertWarningTemplate({ name, title, message, actionLink, appName, year: currentYear });
};

const getAlertDanger = (email, title, message, actionLink = null, appName = "WorkPing") => {
    const name = email.split("@")[0].toUpperCase();
    return alertDangerTemplate({ name, title, message, actionLink, appName, year: currentYear });
};

const getAlertSuccess = (email, title, message, appName = "WorkPing") => {
    const name = email.split("@")[0].toUpperCase();
    return alertSuccessTemplate({ name, title, message, appName, year: currentYear });
};

const getNotification = (email, title = "Notification", message = "", appName = "WorkPing") => {
    const name = email.split("@")[0].toUpperCase();
    return notificationTemplate({ name, title, message, appName, year: currentYear });
};

export default {
    getOtp,
    getResetPasswordOtp,
    getVerifyPassword,
    getForgotPassword,
    getGreeting,
    getAlertInfo,
    getAlertWarning,
    getAlertDanger,
    getAlertSuccess,
    getNotification,
};
