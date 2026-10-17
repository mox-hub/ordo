import { describe, expect, it } from 'vitest';
import { dictionaries, t } from './index';
import { zhCN } from './zh-CN';

describe('i18n', () => {
  it('变量插值', () => {
    expect(t('inbox.unreadCount', { count: 3 })).toBe('3 条未读');
  });

  it('缺变量保留占位符（诚实暴露而非静默空串）', () => {
    expect(t('inbox.unreadCount')).toBe('{count} 条未读');
  });

  it('en 词典与 zh-CN 键集对齐', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(zhCN).sort());
  });
});
