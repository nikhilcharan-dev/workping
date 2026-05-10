import mongoose from "mongoose";

const skillsSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

skillsSchema.index({ userId: 1, skillName: 1 }, { unique: true });

export default mongoose.model("Skills", skillsSchema);
