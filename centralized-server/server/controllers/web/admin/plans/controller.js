import { asyncHandler } from "#utils/async.handler.js";
import Plan from "#models/Plan.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";

// ── Custom plan feature catalogue (single source of truth) ───────────────────
export const EMPLOYEE_TIERS = [
  { label: "Up to 25", max: 25, price: 0 },
  { label: "Up to 50", max: 50, price: 100 },
  { label: "Up to 150", max: 150, price: 300 },
  { label: "Up to 500", max: 500, price: 700 },
  { label: "Up to 1,500", max: 1500, price: 1400 },
  { label: "Unlimited", max: 9999, price: 2500 },
];

export const ADD_ONS = [
  { id: "face_recognition", label: "Face Recognition Attendance", price: 299 },
  { id: "team_management", label: "Team Management", price: 149 },
  { id: "project_management", label: "Project Management", price: 149 },
  { id: "holiday_management", label: "Holiday Management", price: 99 },
  { id: "whatsapp", label: "WhatsApp Notifications", price: 199 },
  { id: "analytics", label: "Advanced Analytics", price: 199 },
  { id: "priority_support", label: "Priority Support", price: 299 },
];

const BASE_PRICE = 199; // attendance + leave management included

const DEFAULT_PLANS = [
  {
    name: "Basic",
    description: "Perfect for small teams getting started.",
    amount: 499,
    billingCycle: "MONTHLY",
    maxEmployees: 10,
    features: ["Up to 10 employees", "Attendance tracking", "Leave management", "Email support"],
  },
  {
    name: "Standard",
    description: "Great for growing businesses.",
    amount: 999,
    billingCycle: "MONTHLY",
    maxEmployees: 25,
    features: [
      "Up to 25 employees",
      "Everything in Basic",
      "Team & project management",
      "Holiday management",
      "Priority email support",
    ],
  },
  {
    name: "Pro",
    description: "For teams that need more power.",
    amount: 1999,
    billingCycle: "MONTHLY",
    maxEmployees: 100,
    features: [
      "Up to 100 employees",
      "Everything in Standard",
      "Face recognition attendance",
      "WhatsApp notifications",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    description: "Unlimited scale for large organisations.",
    amount: 4999,
    billingCycle: "MONTHLY",
    maxEmployees: 9999,
    features: [
      "Unlimited employees",
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "24/7 support",
    ],
  },
];

// GET /api/admin/plans/custom-catalogue  — returns pricing catalogue for the builder
export const getCustomCatalogue = asyncHandler(async (req, res) => {
  return successResponse(res, "Catalogue fetched", {
    basePrice: BASE_PRICE,
    employeeTiers: EMPLOYEE_TIERS,
    addOns: ADD_ONS,
  });
});

// POST /api/admin/plans/custom  — build & save a one-time custom plan
export const createCustomPlan = asyncHandler(async (req, res) => {
  const { employeeTierIndex, selectedAddOnIds } = req.body;

  const tier = EMPLOYEE_TIERS[employeeTierIndex];
  if (!tier) return errorResponse(res, "Invalid employee tier", 400);

  const selectedAddOns = ADD_ONS.filter((a) => (selectedAddOnIds ?? []).includes(a.id));

  const amount = BASE_PRICE + tier.price + selectedAddOns.reduce((s, a) => s + a.price, 0);

  const features = [`${tier.label} employees`, "Attendance & leave management", ...selectedAddOns.map((a) => a.label)];

  const plan = await Plan.create({
    name: "Custom",
    description: "Your custom plan",
    amount,
    amountInPaise: amount * 100,
    billingCycle: "MONTHLY",
    maxEmployees: tier.max,
    features,
    isActive: true,
  });

  return successResponse(res, "Custom plan created", plan);
});

// GET /api/admin/plans
export const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ amount: 1 }).lean();
  return successResponse(res, "Plans fetched", plans);
});

// POST /api/admin/plans/seed  — idempotent: only inserts missing plans
export const seedPlans = asyncHandler(async (req, res) => {
  const results = [];

  for (const planData of DEFAULT_PLANS) {
    const existing = await Plan.findOne({ name: planData.name });
    if (!existing) {
      const created = await Plan.create(planData);
      results.push({ name: created.name, status: "created", _id: created._id });
    } else {
      results.push({ name: existing.name, status: "already exists", _id: existing._id });
    }
  }

  return successResponse(res, "Seed complete", results);
});
