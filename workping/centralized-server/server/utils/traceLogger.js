import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, "../../face-api.txt");

/**
 * Log a trace message to face-api.txt
 * @param {string} type - 'REQUEST' | 'CHECK' | 'SUCCESS' | 'FAILURE' | 'DATA'
 * @param {string} message - The message to log
 */
export const trace = (type, message) => {
    const timestamp = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
    });

    const logLine = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;

    fs.appendFileSync(LOG_FILE, logLine);
};
