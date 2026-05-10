import axios from "axios";
import FormData from "form-data";

const ociClient = axios.create({
  baseURL: process.env.ORACLE_CLOUD_URI,
  headers: { "x-api-key": process.env.ORACLE_API_KEY },
  timeout: 30000,
});

export const uploadFile = async (bucketName, fileBuffer, originalname, mimetype) => {
  const form = new FormData();
  form.append("file", fileBuffer, { filename: originalname, contentType: mimetype });
  const res = await ociClient.post(`/api/upload/${bucketName}`, form, {
    headers: form.getHeaders(),
  });
  return res.data; // { message, objectName }
};

export const deleteObject = async (bucketName, objectName) => {
  try {
    await ociClient.delete(`/api/object/${bucketName}/${encodeURIComponent(objectName)}`);
  } catch (err) {
    console.error(`[OracleCloud] Failed to delete ${bucketName}/${objectName}:`, err?.response?.data ?? err.message);
  }
};

export const getPresignedDownloadUrl = async (bucketName, objectName) => {
  const res = await ociClient.get(`/api/presigned/download/${bucketName}/${encodeURIComponent(objectName)}`);
  return res.data; // { downloadUrl, expiresAt }
};
