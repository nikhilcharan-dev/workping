import axios from "axios";

const FACE_API_URI = process.env.IMAGE_CLASSIFICATION_URI;

/**
 * Submit face recognition task to queue
 */
export const submitRecognitionTask = async (imageBuffer, userId, organizationId) => {
  const image_base64 = imageBuffer.toString("base64");

  const { data } = await axios.post(
    `${FACE_API_URI}/api/v1/detect`,
    {
      image_base64,
      user_id: userId,
      organization_id: organizationId.toString(),
    },
    { timeout: 30000 }
  );

  return data;
};

/**
 * Poll face recognition task status
 */
export const checkRecognitionStatus = async (ticketId) => {
  try {
    const { data } = await axios.get(`${FACE_API_URI}/api/v1/ticket/${ticketId}`, { timeout: 5000 });
    return data;
  } catch (err) {
    if (err.response?.status === 404) return { status: "failed", error: "Ticket not found" };
    throw err;
  }
};

/**
 * Verify liveness detection (anti-spoofing check)
 * Sends sequential frames to face-api liveness endpoint
 */
export const checkLiveness = async (frames) => {
  const frames_base64 = frames.map(f => f.buffer.toString("base64"));

  const { data } = await axios.post(
    `${FACE_API_URI}/api/v1/liveness/check`,
    { frames: frames_base64 },
    { timeout: 10000 }
  );

  return data;
};
