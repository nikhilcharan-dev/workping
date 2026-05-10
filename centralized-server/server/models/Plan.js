import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Amount in paise for PhonePe (amount * 100)
    amountInPaise: {
      type: Number,
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ["MONTHLY", "YEARLY"],
      default: "MONTHLY",
    },

    maxEmployees: {
      type: Number,
      default: 10,
    },

    maxOrganizations: {
      type: Number,
      default: 1,
    },

    maxTeams: {
      type: Number,
      default: 3,
    },

    maxProjects: {
      type: Number,
      default: 5,
    },

    // Human-readable feature list shown on pricing page
    features: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Keep amountInPaise in sync automatically
planSchema.pre("save", function (next) {
  this.amountInPaise = Math.round(this.amount * 100);
  next();
});

export default mongoose.model("Plan", planSchema);
