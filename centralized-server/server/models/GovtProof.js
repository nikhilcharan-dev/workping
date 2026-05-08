import mongoose from "mongoose";

const govtProofSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        aadhaarNumber: { type: String, required: true },

        passportNumber: String,

        panNumber: String,

        bankAccount: String,

        bankName: String,

        ifscCode: {
            type: String,
            match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"],
        },
    },
    { timestamps: true }
);

govtProofSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model("GovtProof", govtProofSchema);
