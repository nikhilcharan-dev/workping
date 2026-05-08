import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "../data/analytics.json");

const INITIAL_DATA = {
    totalSent: 0,
    success: 0,
    failure: 0,
    byType: {
        otp: 0,
        forgotPassword: 0,
        greeting: 0,
        alert: 0,
        notification: 0,
        raw: 0,
    },
    lastUpdated: new Date().toISOString(),
};

async function ensureFile() {
    try {
        await fs.access(DATA_PATH);
    } catch {
        await fs.writeFile(DATA_PATH, JSON.stringify(INITIAL_DATA, null, 2));
    }
}

export async function logEmailEvent(type, status) {
    try {
        await ensureFile();
        const content = await fs.readFile(DATA_PATH, "utf-8");
        const data = JSON.parse(content);

        data.totalSent++;
        if (status === "success") {
            data.success++;
        } else {
            data.failure++;
        }

        if (data.byType[type] !== undefined) {
            data.byType[type]++;
        } else {
            data.byType.raw++;
        }

        data.lastUpdated = new Date().toISOString();

        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("[Analytics Error] Failed to log event:", err.message);
    }
}

export async function getStats() {
    try {
        await ensureFile();
        const content = await fs.readFile(DATA_PATH, "utf-8");
        return JSON.parse(content);
    } catch (err) {
        console.error("[Analytics Error] Failed to get stats:", err.message);
        return INITIAL_DATA;
    }
}
