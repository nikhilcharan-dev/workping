import mongoose from "mongoose";
import crypto from "crypto";

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
    },
    // "web" or "mobile" — mobile tokens get longer expiry
    platform: {
      type: String,
      enum: ["web", "mobile"],
      default: "web",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index — MongoDB auto-deletes expired docs
    },
  },
  { timestamps: true }
);

/**
 * Generate a cryptographically random refresh token string.
 */
refreshTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(40).toString("hex");
};

export default mongoose.model("RefreshToken", refreshTokenSchema);
