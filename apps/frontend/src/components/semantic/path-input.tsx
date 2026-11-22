/**
 * PathInput —— 主仓桌面壳/i18n 适配层。
 *
 * 展示与验证状态机已迁至 @mox-hub/patterns；本文件注入 Electron 壳选择器
 * （pick）与 react-i18next 文案，保留既有桌面端体验。
 */
import { useTranslation } from 'react-i18next';
import {
  PathInput as PatternPathInput,
  type PathInputProps,
  type PathPickRequest,
} from '@mox-hub/patterns/components/path-input';
import type { PatternTranslate } from '@mox-hub/patterns/lib/translate';
import { invoke, isDesktopShellAvailable } from '@/shared/types/electron-api';

export type { PathCheckResult, PathInputProps } from '@mox-hub/patterns/components/path-input';

async function pickWithDesktopShell(request: PathPickRequest): Promise<string | null> {
  const result = await invoke<{ path: string | null }>(
    request.kind === 'file' ? 'choose_file' : 'choose_directory',
    { title: request.title, filters: request.filters },
  );
  return result.path ?? null;
}

export function PathInput(props: PathInputProps) {
  const { t } = useTranslation();
  const translate: PatternTranslate = (key, fallbackOrOptions) =>
    typeof fallbackOrOptions === 'string'
      ? t(key, fallbackOrOptions)
      : t(key, fallbackOrOptions as Record<string, unknown>);
  return (
    <PatternPathInput
      {...props}
      pick={props.pick ?? (isDesktopShellAvailable() ? pickWithDesktopShell : undefined)}
      translate={props.translate ?? translate}
    />
  );
}
