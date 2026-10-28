import { resolveDisposition } from './artifact.controller';

/**
 * raw 端点 Content-Disposition 白名单单测（CAP-A-32 / GAP-T-75）：
 * 图片/PDF/文本 inline；svg/HTML 一律 attachment（XSS 面）；未知二进制 attachment。
 */
describe('resolveDisposition 预览白名单', () => {
  it('白名单类型 inline', () => {
    expect(resolveDisposition('image/png')).toBe('inline');
    expect(resolveDisposition('image/jpeg')).toBe('inline');
    expect(resolveDisposition('application/pdf')).toBe('inline');
    expect(resolveDisposition('text/plain')).toBe('inline');
    expect(resolveDisposition('text/markdown')).toBe('inline');
  });

  it('svg 因内联脚本面强制 attachment', () => {
    expect(resolveDisposition('image/svg+xml')).toBe('attachment');
  });

  it('HTML 族强制 attachment', () => {
    expect(resolveDisposition('text/html')).toBe('attachment');
    expect(resolveDisposition('application/xhtml+xml')).toBe('attachment');
  });

  it('未知/缺失类型 attachment', () => {
    expect(resolveDisposition('application/octet-stream')).toBe('attachment');
    expect(resolveDisposition('application/zip')).toBe('attachment');
    expect(resolveDisposition(null)).toBe('attachment');
  });
});
