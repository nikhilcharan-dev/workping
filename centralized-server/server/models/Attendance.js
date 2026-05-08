import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
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

        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            index: true,
        },

        date: { type: Date, required: true, index: true },

        status: {
            type: String,
            enum: ["present", "absent", "late", "halfDay"],
            required: true,
            index: true,
        },

        checkIn: Date,
        checkOut: Date,

        remarks: String,
    },
    { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
