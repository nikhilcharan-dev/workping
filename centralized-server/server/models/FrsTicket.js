import mongoose from "mongoose";

const frsTicketSchema = new mongoose.Schema(
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
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "FRS / Biometric attendance not updating",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FrsTicket", frsTicketSchema);
