import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    flow: {
      type: String,
      default: null,
    },
    step: {
      type: String,
      default: null,
    },
    pendingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    history: [
      {
        role: String,
        content: String,
        timestamp: {
          type: Number,
          default: Date.now,
        },
      },
    ],
    lastActivity: {
      type: Number,
      default: Date.now,
    },
    // TTL index: automatically delete sessions after 48 hours of inactivity
    lastActivityAt: {
      type: Date,
      default: Date.now,
      expires: 48 * 60 * 60, // 48 hours in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Update lastActivity on every save to refresh TTL
sessionSchema.pre("save", function (next) {
  this.lastActivity = Date.now();
  this.lastActivityAt = new Date();
  next();
});

const Session = mongoose.model("Session", sessionSchema);

export default Session;
