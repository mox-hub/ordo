/**
 * token 存储抽象（原语层）。
 *
 * PRINCIPLES-MOBILE §11.5 / 工程接入方案 §六：token 禁入 AsyncStorage，
 * 生产适配器走 Keychain/Keystore（见 ./secure-store）；此接口同时是
 * 测试与纯逻辑层的注入点（tests 用 createMemoryTokenStorage 替身）。
 */
export interface TokenStorage {
  getToken(): Promise<string | null>;
  saveToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** 内存替身：单测 / 预览环境用，不落盘 */
export function createMemoryTokenStorage(initial: string | null = null): TokenStorage {
  let token = initial;
  return {
    async getToken() {
      return token;
    },
    async saveToken(next) {
      token = next;
    },
    async clear() {
      token = null;
    },
  };
}
