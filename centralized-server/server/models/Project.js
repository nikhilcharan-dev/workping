import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        projectManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        assignedDate: {
            type: Date,
            default: Date.now,
            required: true,
        },
        dueDate: Date,
        contractedBy: {
            type: String,
            trim: true,
        },
        shiftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shift",
        },
        status: {
            type: String,
            enum: ["active", "completed", "onHold"],
            default: "active",
            index: true,
        },
    },
    { timestamps: true, strict: true }
);

projectSchema.index({ name: 1, organizationId: 1 }, { unique: true });

export const requiredProjectFields = ["name", "organizationId", "projectManager"];

export const optionalProjectFields = ["description", "dueDate", "assignedDate", "contractedBy"];

export default mongoose.model("Project", projectSchema);
