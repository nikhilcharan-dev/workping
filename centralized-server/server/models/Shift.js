import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    startTime: { type: String, required: true },

    endTime: { type: String, required: true },

    breakMinutes: { type: Number, default: 60 },

    slotStart: String,
    slotEnd: String,

    date: Date,

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Shift", shiftSchema);
