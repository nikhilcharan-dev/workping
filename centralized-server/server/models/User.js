import mongoose from "mongoose";

/*
    @password & authentication is moved to Account Schema
 */
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },

        email: { type: String, required: true, unique: true, index: true },

        phone: { type: String, unique: true, required: true },

        employeeId: { type: String, required: true },

        gender: {
            type: String,
            enum: ["male", "female", "other"],
            default: "other",
        },

        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        profileImage: {
            type: String,
            default: null,
        },

        salary: { type: Number, default: 0 },

        dob: Date,

        address: String,

        dateOfJoining: { type: Date, required: true, index: true },

        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
            index: true,
        },

        role: {
            type: String,
            enum: ["manager", "teamLead", "employee"],
            default: "employee",
            index: true,
        },

        isActive: { type: Boolean, default: true, index: true },

        workType: {
            type: String,
            enum: ["remote", "onsite", "hybrid"],
            required: true,
        },
    },
    { timestamps: true }
);

userSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
