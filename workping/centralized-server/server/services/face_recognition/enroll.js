import axios from "axios";

const FACE_API_URI = process.env.IMAGE_CLASSIFICATION_URI;

/**
 * Enroll a face for an employee.
 * Sends the raw image to the face-api which extracts the embedding
 * and persists it in MongoDB.
 *
 * @param {Buffer} imageBuffer
 * @param {object} user  Needs: _id, organizationId
 */
export const enrollFace = async (imageBuffer, user) => {
    const image_base64 = imageBuffer.toString("base64");

    // Embeddings are keyed by MongoDB _id (consistent with detect calls)
    const { data } = await axios.post(`${FACE_API_URI}/api/v1/enroll`, {
        image_base64,
        employee_id: user._id.toString(),
        organization_id: user.organizationId.toString(),
    });

    if (!data.success) {
        throw new Error("Face API failed to enroll face");
    }

    return data;
};

/**
 * Check whether a face embedding exists for a given user.
 * Hits the per-user lookup endpoint — does not download the full org list.
 */
export const checkFaceStatus = async (userId) => {
    try {
        const { data } = await axios.get(`${FACE_API_URI}/api/v1/embeddings/${encodeURIComponent(userId.toString())}`, {
            timeout: 5000,
        });
        return data.registered === true;
    } catch {
        return false;
    }
};

/**
 * Remove a face embedding by MongoDB userId (_id string).
 * Fire-and-forget safe — does not throw.
 */
export const deleteFace = async (userId) => {
    try {
        await axios.delete(`${FACE_API_URI}/api/v1/embeddings/${encodeURIComponent(userId)}`);
    } catch (err) {
        console.error(`[FaceAPI] Failed to delete face for userId "${userId}":`, err?.response?.data || err.message);
    }
};
