import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenStorage } from './token-storage';

// 与前端 localStorage 的 access_token 同名对齐（同一 token 口径，便于排障对照）。
export const TOKEN_STORAGE_KEY = 'access_token';

/** 原生适配器：iOS Keychain / Android Keystore（工程接入方案 §六 安全存储红线） */
function createNativeStorage(): TokenStorage {
  return {
    async getToken() {
      return (await SecureStore.getItemAsync(TOKEN_STORAGE_KEY)) ?? null;
    },
    async saveToken(token) {
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
    },
    async clear() {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    },
  };
}

/**
 * Web 回落：expo-secure-store 无 web 原生模块（RN-Web 演示/调试用）。
 * 原生端 token 红线（禁 AsyncStorage/明文）不受此影响——按平台注入。
 */
function createWebStorage(): TokenStorage {
  return {
    async getToken() {
      return globalThis.localStorage?.getItem(TOKEN_STORAGE_KEY) ?? null;
    },
    async saveToken(token) {
      globalThis.localStorage?.setItem(TOKEN_STORAGE_KEY, token);
    },
    async clear() {
      globalThis.localStorage?.removeItem(TOKEN_STORAGE_KEY);
    },
  };
}

export const secureTokenStorage: TokenStorage =
  Platform.OS === 'web' ? createWebStorage() : createNativeStorage();
