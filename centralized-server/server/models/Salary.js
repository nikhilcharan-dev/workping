import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    role: { type: String, required: true },

    // Format: "YYYY-MM" e.g. "2024-03"
    month: {
      type: String,
      required: true,
      index: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format"],
    },

    daysPresent: { type: Number, required: true },
    lopDays: { type: Number, required: true },
    overtimeHours: { type: Number, default: 0 },

    baseSalary: { type: Number, required: true },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },

    netSalary: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    generatedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

salarySchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.model("Salary", salarySchema);
