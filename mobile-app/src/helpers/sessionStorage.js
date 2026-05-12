/**
 * Mobile session storage — SecureStore-backed.
 *
 * The session JSON (token + refreshToken + user metadata) is keyed under
 * AUTH_STORAGE_KEY in expo-secure-store (Keychain on iOS, EncryptedSharedPreferences
 * on Android). Previously, AuthContext used SecureStore but httpClient/faceApi
 * read the same key from AsyncStorage — meaning the request interceptor never
 * found a token, and rotated refresh tokens were written to a location the
 * AuthProvider couldn't see. That split-brain is fixed by going through this
 * helper everywhere.
 */

import * as SecureStore from "expo-secure-store";
import { AUTH_STORAGE_KEY } from "@/context/constants";

export async function getSessionRaw() {
  try {
    return await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function getSession() {
  const raw = await getSessionRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getBearerToken() {
  const session = await getSession();
  return session?.token || null;
}

export async function setSession(session) {
  if (!session) return;
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  } catch {
    // Already gone or store unavailable — in-memory state is the source of truth
  }
}
