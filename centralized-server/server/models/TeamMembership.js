import mongoose from "mongoose";

const teamMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    joinedAt: { type: Date, default: Date.now },

    leftAt: Date,

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

teamMembershipSchema.index({ userId: 1, teamId: 1 }, { unique: true });

export default mongoose.model("TeamMembership", teamMembershipSchema);
