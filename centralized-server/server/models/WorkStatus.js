import mongoose from "mongoose";

const workStatusSchema = new mongoose.Schema(
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

    date: { type: Date, required: true, index: true },

    type: {
      type: String,
      enum: ["WD", "CL", "OD"],
      required: true,
      index: true,
    },

    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "HalfDay", "OnLeave", "Holiday"],
      required: true,
    },
  },
  { timestamps: true }
);

workStatusSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("WorkStatus", workStatusSchema);
