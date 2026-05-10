import mongoose from "mongoose";

/*
    @password & authentication is moved to Account Schema
 */
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    emailVerified: { type: Boolean, default: false },

    phoneNumber: { type: String },

    phoneVerified: { type: Boolean, default: false },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    profileImage: { type: String },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
