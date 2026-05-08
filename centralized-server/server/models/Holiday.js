import mongoose from "mongoose";

const holidayInfoSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        type: { type: String, enum: ["public", "organization"], required: true },

        date: { type: Date, required: true, index: true },

        isWorkingDay: { type: Boolean, default: false },

        description: String,
    },
    { timestamps: true }
);

holidayInfoSchema.index({ organizationId: 1, date: 1 }, { unique: true });

export default mongoose.model("Holiday", holidayInfoSchema);
