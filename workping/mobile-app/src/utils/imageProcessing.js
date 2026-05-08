/**
 * Image processing pipeline — crop face region + compress.
 * Wraps expo-image-manipulator.
 *
 * Full frame:   640x480  → ~2MB
 * Cropped face: 224x224  → ~80KB (96% savings)
 */

import * as ImageManipulator from "expo-image-manipulator";

const CROP_CONFIG = {
    PADDING: 0.35, // 35% padding around face bounding box
    TARGET_SIZE: 224, // 224x224 px — standard face model input
    JPEG_QUALITY: 0.85, // balance quality vs size
};

/**
 * Crop the face region from a full camera photo and compress.
 *
 * IMPORTANT: Face bounds from the frame processor are in preview coordinates
 * (e.g., 640x480), but takePhoto() returns full sensor resolution (e.g., 4032x3024).
 * We must scale the bounds to match the photo dimensions.
 *
 * @param {string} photoUri - file:// URI from camera.takePhoto()
 * @param {{ x: number, y: number, width: number, height: number }} faceBounds - pixel coords from ML Kit
 * @param {{ width: number, height: number }} frameSize - frame processor dimensions
 * @param {{ width: number, height: number }} photoSize - actual photo dimensions
 * @returns {{ base64: string, uri: string }}
 */
export async function cropFace(photoUri, faceBounds, frameSize, photoSize) {
    // Scale factor: photo resolution vs preview resolution
    const scaleX = photoSize.width / frameSize.width;
    const scaleY = photoSize.height / frameSize.height;

    // Scale face bounds to photo coordinates
    const faceX = faceBounds.x * scaleX;
    const faceY = faceBounds.y * scaleY;
    const faceW = faceBounds.width * scaleX;
    const faceH = faceBounds.height * scaleY;

    // Add padding
    const padX = faceW * CROP_CONFIG.PADDING;
    const padY = faceH * CROP_CONFIG.PADDING;

    // Make square (take the larger dimension)
    const rawW = faceW + padX * 2;
    const rawH = faceH + padY * 2;
    const squareSize = Math.max(rawW, rawH);

    // Center the square on the face
    const centerX = faceX + faceW / 2;
    const centerY = faceY + faceH / 2;

    // Clamp to image boundaries
    let originX = Math.max(0, centerX - squareSize / 2);
    let originY = Math.max(0, centerY - squareSize / 2);
    let cropW = squareSize;
    let cropH = squareSize;

    // Don't exceed image bounds
    if (originX + cropW > photoSize.width) {
        cropW = photoSize.width - originX;
    }
    if (originY + cropH > photoSize.height) {
        cropH = photoSize.height - originY;
    }

    // Maintain square after clamping
    const clampedSize = Math.min(cropW, cropH);
    cropW = clampedSize;
    cropH = clampedSize;

    // Floor all values (manipulator needs integers)
    originX = Math.floor(originX);
    originY = Math.floor(originY);
    cropW = Math.floor(cropW);
    cropH = Math.floor(cropH);

    // Ensure minimum crop size
    if (cropW < 50 || cropH < 50) {
        // Fallback: compress full photo
        return compressFullPhoto(photoUri);
    }

    const result = await ImageManipulator.manipulateAsync(
        photoUri,
        [
            { crop: { originX, originY, width: cropW, height: cropH } },
            { resize: { width: CROP_CONFIG.TARGET_SIZE, height: CROP_CONFIG.TARGET_SIZE } },
        ],
        {
            compress: CROP_CONFIG.JPEG_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
        }
    );

    return {
        base64: result.base64,
        uri: result.uri,
    };
}

/**
 * Fallback: compress the full photo without cropping.
 * Used when face bounds are unreliable.
 *
 * @param {string} photoUri - file:// URI
 * @returns {{ base64: string, uri: string }}
 */
export async function compressFullPhoto(photoUri) {
    const result = await ImageManipulator.manipulateAsync(photoUri, [{ resize: { width: 480 } }], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
    });

    return {
        base64: result.base64,
        uri: result.uri,
    };
}

export { CROP_CONFIG };
