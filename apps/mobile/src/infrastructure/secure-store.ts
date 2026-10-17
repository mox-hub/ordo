import * as SecureStore from 'expo-secure-store';
import type { TokenStorage } from './token-storage';

// 与前端 localStorage 的 access_token 同名对齐（同一 token 口径，便于排障对照）。
export const TOKEN_STORAGE_KEY = 'access_token';

/** 生产适配器：iOS Keychain / Android Keystore（工程接入方案 §六 安全存储红线） */
export const secureTokenStorage: TokenStorage = {
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
