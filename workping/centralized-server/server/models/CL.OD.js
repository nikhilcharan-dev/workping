import mongoose from "mongoose";

const cl_OdSchema = new mongoose.Schema(
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
            enum: ["CL", "OD"],
            required: true,
        },
        reason: { type: String },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

cl_OdSchema.index({ userId: 1, date: 1, type: 1 }, { unique: true });

export default mongoose.model("CL_OD", cl_OdSchema);
