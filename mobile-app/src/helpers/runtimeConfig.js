import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL as STATIC_URL } from "./config";

const OVERRIDE_KEY = "WP_API_URL_OVERRIDE";

class RuntimeConfig {
    constructor() {
        this.apiUrl = STATIC_URL;
        this.isInitialized = false;
        this._initPromise = null; // concurrency guard
    }

    async init() {
        if (this.isInitialized) return this.apiUrl;
        // If a concurrent init() is already in-flight, reuse its promise
        if (this._initPromise) return this._initPromise;

        this._initPromise = (async () => {
            try {
                const saved = await AsyncStorage.getItem(OVERRIDE_KEY);
                if (saved) this.apiUrl = saved;
            } catch (e) {
                console.error("[RuntimeConfig] Failed to load override", e);
            }
            this.isInitialized = true;
            this._initPromise = null;
            return this.apiUrl;
        })();

        return this._initPromise;
    }

    getApiUrl() {
        return this.apiUrl;
    }

    async setApiUrl(newUrl) {
        if (!newUrl) {
            await AsyncStorage.removeItem(OVERRIDE_KEY);
            this.apiUrl = STATIC_URL;
        } else {
            await AsyncStorage.setItem(OVERRIDE_KEY, newUrl);
            this.apiUrl = newUrl;
        }
        return this.apiUrl;
    }
}

const runtimeConfig = new RuntimeConfig();
export default runtimeConfig;
