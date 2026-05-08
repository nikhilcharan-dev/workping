import mongoose from "mongoose";

const projectTeamSchema = new mongoose.Schema(
    {
        teamName: { type: String, required: true, trim: true },

        description: { type: String },

        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },

        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        teamManagerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        teamLeaderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

projectTeamSchema.index({ teamName: 1, projectId: 1 }, { unique: true });

export default mongoose.model("ProjectTeam", projectTeamSchema);
