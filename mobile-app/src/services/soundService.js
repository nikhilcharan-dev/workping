import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

// ── Sound assets ──────────────────────────────────────────────────────────────
const SOURCES = {
    success: require("../../assets/sounds/success.wav"),
    retry: require("../../assets/sounds/retry.wav"),
    error: require("../../assets/sounds/error.wav"),
    login: require("../../assets/sounds/login.wav"),
};

// ── State ─────────────────────────────────────────────────────────────────────
const _players = {};
let _audioModeSet = false;

// ── Internal ──────────────────────────────────────────────────────────────────
async function _ensureAudioMode() {
    if (_audioModeSet) return;
    await setAudioModeAsync({
        playsInSilentModeIOS: false, // respects the iOS silent switch
        shouldDuckAndroid: true, // briefly ducks music/podcasts
    });
    _audioModeSet = true;
}

async function _play(name) {
    try {
        await _ensureAudioMode();

        if (!_players[name]) {
            _players[name] = createAudioPlayer(SOURCES[name]);
        }

        // Seek to beginning so rapid calls always replay from the start
        _players[name].seekTo(0);
        _players[name].play();
    } catch (err) {
        // Log so the developer can see native module failures in the console
        console.warn("[SoundService] Failed to play", name, "—", err?.message ?? err);
    }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Preload all players into memory. Call once after login for zero-latency
 * first play. Safe to call multiple times.
 */
export async function preloadSounds() {
    try {
        await _ensureAudioMode();
        for (const name of Object.keys(SOURCES)) {
            if (!_players[name]) {
                _players[name] = createAudioPlayer(SOURCES[name]);
            }
        }
        console.log("[SoundService] All sounds preloaded");
    } catch (err) {
        console.warn("[SoundService] Preload failed —", err?.message ?? err);
    }
}

/** Release all players (call on logout to free native resources). */
export function unloadSounds() {
    for (const name of Object.keys(_players)) {
        try {
            _players[name].remove();
        } catch {
            /* ignore */
        }
        delete _players[name];
    }
    _audioModeSet = false;
}

/** Ascending two-note chime — face attendance marked successfully */
export const playSuccess = () => _play("success");

/** Soft descending pair — face not recognised, try again */
export const playRetry = () => _play("retry");

/** Low double beep — network / server error */
export const playError = () => _play("error");

/** Warm ascending triad — login successful */
export const playLogin = () => _play("login");
