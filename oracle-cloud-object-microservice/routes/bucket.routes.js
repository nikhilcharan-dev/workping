import { Router } from "express";
import multer from "multer";
import fs from "fs/promises";
import { Readable } from "stream";
import contentDisposition from "content-disposition";

import client from "../oci.client.js";
import { getNamespace } from "../oci.namespace.js";
import logger from "../logger.js";
import { validateBucketName, validateObjectName } from "../middleware/validate.js";

const router = Router();

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10) * 1024 * 1024;

const ALLOWED_MIME_TYPES = process.env.ALLOWED_MIME_TYPES ? process.env.ALLOWED_MIME_TYPES.split(",") : null; // null = allow all

const upload = multer({
    dest: "uploads/",
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error(`File type ${file.mimetype} not allowed`));
        }
        cb(null, true);
    },
});

const compartmentId = process.env.COMPARTMENT_ID;

// ============ LIST ALL BUCKETS ============
router.get("/buckets", async (req, res, next) => {
    try {
        const namespaceName = await getNamespace();

        const response = await client.listBuckets({
            namespaceName,
            compartmentId,
        });

        res.json(response.items);
    } catch (err) {
        next(err);
    }
});

// ============ LIST OBJECTS ============
router.get("/objects/:bucketName", validateBucketName, async (req, res, next) => {
    try {
        const namespaceName = await getNamespace();
        const { bucketName } = req.params;

        const response = await client.listObjects({
            namespaceName,
            bucketName,
        });

        res.json(response.listObjects.objects);
    } catch (err) {
        next(err);
    }
});

// ============ UPLOAD FILE ============
router.post("/upload/:bucketName", validateBucketName, upload.single("file"), async (req, res, next) => {
    let tempPath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        tempPath = req.file.path;
        const namespaceName = await getNamespace();
        const { bucketName } = req.params;

        // Sanitize the original filename — strip path components
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._\-]/g, "_");

        const stream = (await fs.open(tempPath, "r")).createReadStream();

        await client.putObject({
            namespaceName,
            bucketName,
            objectName: safeName,
            putObjectBody: stream,
        });

        logger.info({ bucket: bucketName, object: safeName }, "File uploaded");
        res.json({ message: "File uploaded successfully", objectName: safeName });
    } catch (err) {
        next(err);
    } finally {
        if (tempPath) {
            await fs.unlink(tempPath).catch((unlinkErr) => {
                logger.warn({ path: tempPath, err: unlinkErr }, "Failed to clean up temp file");
            });
        }
    }
});

// ============ DOWNLOAD FILE ============
router.get("/download/:bucketName/:objectName", validateBucketName, validateObjectName, async (req, res, next) => {
    try {
        const namespaceName = await getNamespace();
        const { bucketName, objectName } = req.params;

        const response = await client.getObject({
            namespaceName,
            bucketName,
            objectName,
        });

        res.setHeader("Content-Disposition", contentDisposition(objectName));
        res.setHeader("Content-Type", response.contentType || "application/octet-stream");

        const nodeStream = Readable.fromWeb(response.value);

        nodeStream.on("error", (err) => {
            logger.error({ err, bucket: bucketName, object: objectName }, "Stream error during download");
            if (!res.headersSent) {
                res.status(500).json({ error: "Download stream failed" });
            } else {
                res.destroy();
            }
        });

        nodeStream.pipe(res);
    } catch (err) {
        next(err);
    }
});

// ============ DELETE OBJECT ============
router.delete("/object/:bucketName/:objectName", validateBucketName, validateObjectName, async (req, res, next) => {
    try {
        const namespaceName = await getNamespace();
        const { bucketName, objectName } = req.params;

        await client.deleteObject({
            namespaceName,
            bucketName,
            objectName,
        });

        logger.info({ bucket: bucketName, object: objectName }, "Object deleted");
        res.json({ message: "Object deleted successfully" });
    } catch (err) {
        next(err);
    }
});

export default router;
