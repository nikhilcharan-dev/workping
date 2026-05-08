import mongoose from "mongoose";

const socialLinksSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        linkedin: String,

        github: String,

        facebook: String,

        portfolio: String,

        twitter: String,

        instagram: String,
    },
    { timestamps: true }
);

socialLinksSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model("SocialLinks", socialLinksSchema);
