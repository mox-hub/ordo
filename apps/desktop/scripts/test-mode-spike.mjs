/**
 * CAP-A-31 批 0 spike 启动器：注入 ORDO_TEST_MODE_SPIKE=1 后经 node 拉起 electron
 * （electron/cli.js 直跑，绕开 .bin shim 的平台差异），壳内跑完五验证点自动退出。
 * 用法：pnpm --filter desktop spike:test-mode
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronCli = path.join(root, 'node_modules', 'electron', 'cli.js');

const result = spawnSync(process.execPath, [electronCli, '.'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ORDO_TEST_MODE_SPIKE: '1' },
});
process.exit(result.status ?? 1);
