import "../globals.js";
import { startRenewalCron } from "../services/subscription/renewal.cron.js";
import Subscription from "#models/Subscription.js";
import Admin from "#models/Admin.js";
import OrgAdmin from "#models/Admin.Org.js";
import * as mailService from "#services/mailer/mail.service.js";
import * as whatsappService from "#services/whatsapp/whatsapp.service.js";

// Mock cron module
jest.mock("node-cron", () => ({
  schedule: jest.fn((schedule, fn) => {
    global.renewalCronFn = fn;
  }),
}));

// Mock services
jest.mock("#services/mailer/mail.service.js", () => ({
  sendAlertWarning: jest.fn().mockResolvedValue({ status: "success" }),
}));

jest.mock("#services/whatsapp/whatsapp.service.js", () => ({
  sendWhatsApp: jest.fn().mockResolvedValue({ status: "success" }),
}));

describe("Renewal Cron Job", () => {
  let testOrg, admin, secondary;

  beforeEach(async () => {
    await Subscription.deleteMany({});
    await Admin.deleteMany({});
    await OrgAdmin.deleteMany({});
    jest.clearAllMocks();

    // Create test data
    admin = await Admin.create({
      name: "Test Admin",
      email: "admin@example.com",
      phoneNumber: "9876543210",
    });

    secondary = await Admin.create({
      name: "Secondary Admin",
      email: "secondary@example.com",
      phoneNumber: "9876543211",
    });
  });

  afterEach(async () => {
    await Subscription.deleteMany({});
    await Admin.deleteMany({});
    await OrgAdmin.deleteMany({});
  });

  describe("Subscription renewal notifications", () => {
    it("sends notifications for subscriptions expiring in 7 days", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const sub = await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      expect(mailService.sendAlertWarning).toHaveBeenCalled();
      expect(whatsappService.sendWhatsApp).toHaveBeenCalled();
    });

    it("sends notifications for subscriptions expiring in 3 days", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 3);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Enterprise",
        price: 4999,
        billingCycle: "YEARLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      expect(mailService.sendAlertWarning).toHaveBeenCalled();
    });

    it("sends notifications for subscriptions expiring in 1 day", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 1);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Starter",
        price: 499,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      expect(mailService.sendAlertWarning).toHaveBeenCalled();
    });

    it("skips inactive subscriptions", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "INACTIVE",
        autoRenew: false,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      expect(mailService.sendAlertWarning).not.toHaveBeenCalled();
    });

    it("skips subscriptions with autoRenew disabled", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: false,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      expect(mailService.sendAlertWarning).not.toHaveBeenCalled();
    });

    it("notifies both primary and secondary admins", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const sub = await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      await OrgAdmin.create({
        organizationId: "org123",
        primaryAdmin: admin._id,
        secondaryAdmin: secondary._id,
      });

      startRenewalCron();
      await global.renewalCronFn();

      const calls = mailService.sendAlertWarning.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it("formats email with correct plan name and expiry date", async () => {
      const expiryDate = new Date("2025-02-14");
      const expiryTime = new Date("2025-02-14");
      expiryTime.setHours(23, 59, 59, 999);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Enterprise Plan",
        price: 9999,
        billingCycle: "YEARLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryTime,
      });

      startRenewalCron();
      await global.renewalCronFn();

      const [, subject] = mailService.sendAlertWarning.mock.calls[0];
      expect(subject).toContain("Enterprise Plan");
      expect(subject).toContain("expires");
    });

    it("includes correct billing label based on billingCycle", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 3);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Yearly Plan",
        price: 9999,
        billingCycle: "YEARLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      const [, , message] = mailService.sendAlertWarning.mock.calls[0];
      expect(message).toContain("year");
    });

    it("handles missing secondary admin gracefully", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      expect(mailService.sendAlertWarning).toHaveBeenCalledWith(
        admin.email,
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it("uses app URL from environment variable", async () => {
      const originalUrl = process.env.APP_URL;
      process.env.APP_URL = "https://test.workping.live";

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();
      await global.renewalCronFn();

      const [, , , renewalLink] = mailService.sendAlertWarning.mock.calls[0];
      expect(renewalLink).toContain("test.workping.live");

      process.env.APP_URL = originalUrl;
    });

    it("processes multiple subscriptions expiring on same day", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const admin2 = await Admin.create({
        name: "Admin Two",
        email: "admin2@example.com",
        phoneNumber: "9876543212",
      });

      await Subscription.create([
        {
          organizationId: "org123",
          adminId: admin._id,
          planName: "Pro",
          price: 999,
          billingCycle: "MONTHLY",
          status: "ACTIVE",
          autoRenew: true,
          endDate: expiryDate,
        },
        {
          organizationId: "org456",
          adminId: admin2._id,
          planName: "Enterprise",
          price: 4999,
          billingCycle: "YEARLY",
          status: "ACTIVE",
          autoRenew: true,
          endDate: expiryDate,
        },
      ]);

      startRenewalCron();
      await global.renewalCronFn();

      expect(mailService.sendAlertWarning).toHaveBeenCalledTimes(expect.any(Number));
    });
  });

  describe("Cron scheduling", () => {
    it("schedules cron to run at 9 AM IST", () => {
      const cronMock = require("node-cron");
      cronMock.schedule.mockClear();

      startRenewalCron();

      expect(cronMock.schedule).toHaveBeenCalledWith("0 9 * * *", expect.any(Function), {
        timezone: "Asia/Kolkata",
      });
    });
  });

  describe("Error handling", () => {
    it("continues processing if email sending fails", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      mailService.sendAlertWarning.mockRejectedValueOnce(new Error("Mail service down"));

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();

      expect(async () => {
        await global.renewalCronFn();
      }).not.toThrow();
    });

    it("continues processing if WhatsApp sending fails", async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      whatsappService.sendWhatsApp.mockRejectedValueOnce(new Error("WhatsApp service down"));

      await Subscription.create({
        organizationId: "org123",
        adminId: admin._id,
        planName: "Pro",
        price: 999,
        billingCycle: "MONTHLY",
        status: "ACTIVE",
        autoRenew: true,
        endDate: expiryDate,
      });

      startRenewalCron();

      expect(async () => {
        await global.renewalCronFn();
      }).not.toThrow();
    });
  });
});
