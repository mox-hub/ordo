import {
  ArtifactStorageService,
  sanitizeFileName,
} from './artifact-storage.service';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

/**
 * 受管存储单测（CAP-A-32）：文件名消毒 + 路径越界拒绝 + 版本路径布局。
 */
describe('ArtifactStorageService', () => {
  const makeService = (configOverrides: Record<string, unknown> = {}) => {
    const prisma = {
      appConfig: {
        findFirst: vi
          .fn()
          .mockResolvedValue(
            Object.keys(configOverrides).length === 0
              ? null
              : { value: configOverrides },
          ),
      },
    };
    const config = { get: vi.fn() };
    return {
      prisma,
      service: new ArtifactStorageService(prisma as any, config as any),
    };
  };

  describe('sanitizeFileName', () => {
    it('剥路径分隔符与非法字符', () => {
      expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j.txt')).toBe(
        'a-b-c-d-e-f-g-h-i-j.txt',
      );
    });

    it('剥控制字符并去掉 Windows 尾点尾空格', () => {
      expect(sanitizeFileName('report\u0001v2. . ')).toBe('report-v2');
    });

    it('全非法输入回退 file，超长截断 120', () => {
      expect(sanitizeFileName('***')).toBe('file');
      expect(sanitizeFileName('x'.repeat(300)).length).toBeLessThanOrEqual(120);
    });
  });

  describe('buildVersionRelPath', () => {
    it('布局为 {artifactId}/v{n}/{fileName}，文件名经消毒（内部空格保留）', () => {
      const { service } = makeService();
      expect(service.buildVersionRelPath('art1', 3, 'a/b/报告 v1.pdf')).toBe(
        'art1/v3/a-b-报告 v1.pdf',
      );
    });
  });

  describe('resolveAbsolute', () => {
    it('相对路径约束在 basePath 之内', async () => {
      const { service } = makeService();
      const abs = await service.resolveAbsolute('art1/v1/a.png');
      expect(abs.replace(/\\/g, '/')).toContain(
        '/ordo/artifacts/art1/v1/a.png',
      );
    });

    it('配置覆盖 basePath 生效', async () => {
      const { service } = makeService({ basePath: '/tmp/artifacts-x' });
      const abs = await service.resolveAbsolute('art1/v1/a.png');
      // path.resolve 平台语义（win32 会把 /tmp 解析到当前盘符），与期望同构比较
      expect(abs).toBe(path.resolve('/tmp/artifacts-x', 'art1/v1/a.png'));
    });

    it('拒绝 .. 越界逃逸', async () => {
      const { service } = makeService();
      await expect(
        service.resolveAbsolute('art1/../../escape.txt'),
      ).rejects.toThrow(BadRequestException);
    });

    it('拒绝绝对路径注入越界', async () => {
      const { service } = makeService();
      await expect(
        service.resolveAbsolute('C:\\Windows\\system32\\evil.dll'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
