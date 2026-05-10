import { Router } from "express";
import client from "../oci.client.js";
import { getNamespace } from "../oci.namespace.js";
import logger from "../logger.js";
import { validateBucketName, validateObjectName, validateObjectNameBody } from "../middleware/validate.js";

const router = Router();

const DEFAULT_EXPIRY_MINUTES = parseInt(process.env.PRESIGNED_EXPIRY_MINUTES || "15", 10);

function getExpiresAt(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function buildOciUrl(region, accessUri) {
  return `https://objectstorage.${region}.oraclecloud.com${accessUri}`;
}

// ============ UPLOAD PRE-SIGNED URL ============
router.post("/upload/:bucketName", validateBucketName, validateObjectNameBody, async (req, res, next) => {
  try {
    const namespaceName = await getNamespace();
    const { bucketName } = req.params;
    const { objectName } = req.body;

    const expiresAt = getExpiresAt(DEFAULT_EXPIRY_MINUTES);

    const response = await client.createPreauthenticatedRequest({
      namespaceName,
      bucketName,
      createPreauthenticatedRequestDetails: {
        name: `upload-${objectName}-${Date.now()}`,
        accessType: "ObjectWrite",
        objectName,
        timeExpires: expiresAt,
      },
    });

    const region = process.env.REGION;
    const uploadUrl = buildOciUrl(region, response.preauthenticatedRequest.accessUri);

    logger.info({ bucket: bucketName, object: objectName }, "Upload pre-signed URL generated");
    res.json({ uploadUrl, expiresAt });
  } catch (err) {
    next(err);
  }
});

// ============ DOWNLOAD PRE-SIGNED URL ============
router.get("/download/:bucketName/:objectName", validateBucketName, validateObjectName, async (req, res, next) => {
  try {
    const namespaceName = await getNamespace();
    const { bucketName, objectName } = req.params;

    const expiresAt = getExpiresAt(DEFAULT_EXPIRY_MINUTES);

    const response = await client.createPreauthenticatedRequest({
      namespaceName,
      bucketName,
      createPreauthenticatedRequestDetails: {
        name: `download-${objectName}-${Date.now()}`,
        accessType: "ObjectRead",
        objectName,
        timeExpires: expiresAt,
      },
    });

    const region = process.env.REGION;
    const downloadUrl = buildOciUrl(region, response.preauthenticatedRequest.accessUri);

    logger.info({ bucket: bucketName, object: objectName }, "Download pre-signed URL generated");
    res.json({ downloadUrl, expiresAt });
  } catch (err) {
    next(err);
  }
});

export default router;
