import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "user", "manager", "teamlead", "employee"],
      default: "employee",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    password: {
      type: String,
    },

    providers: {
      google: {
        id: String,
        linked: { type: Boolean, default: false },
      },
      microsoft: {
        id: String,
        linked: { type: Boolean, default: false },
      },
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Account", accountSchema);
