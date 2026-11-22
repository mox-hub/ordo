/**
 * PageErrorFallback —— 主仓 router 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件注入 useRouteError 与 router Link，
 * 保留既有 SPA 首页跳转语义。
 */
import { Link, useRouteError } from 'react-router-dom';
import {
  PageErrorFallback as PatternPageErrorFallback,
  type PageErrorFallbackProps,
} from '@mox-hub/patterns/components/page-error-fallback';

export type { PageErrorFallbackProps };

export function PageErrorFallback({
  error,
  renderHomeLink,
  ...props
}: PageErrorFallbackProps) {
  const routeError = useRouteError();
  return (
    <PatternPageErrorFallback
      {...props}
      error={error ?? routeError}
      renderHomeLink={
        renderHomeLink ??
        (({ href, className }) => <Link to={href} className={className} />)
      }
    />
  );
}
