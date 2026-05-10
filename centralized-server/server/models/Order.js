import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },

    amount: { type: Number, required: true },

    date: { type: Date, required: true },

    paymentMethod: {
      type: String,
      enum: ["Credit Card", "Debit Card", "UPI", "Net Banking", "Wallet", "Cash"],
      default: "UPI",
    },

    orderStatus: {
      type: String,
      enum: ["Success", "Failed", "Pending"],
      default: "Pending",
      index: true,
    },

    // PhonePe order ID returned on payment initiation
    phonepeOrderId: {
      type: String,
      default: "",
    },

    // PhonePe transaction ID set by webhook on completion
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      sparse: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
