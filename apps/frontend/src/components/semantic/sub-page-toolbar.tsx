/**
 * SubPageToolbar —— 主仓 router 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件注入 react-router 的 Link 与
 * navigate(-1)，保留既有 SPA 跳转/返回语义。
 */
import type { ComponentProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SubPageToolbar as PatternSubPageToolbar } from '@mox-hub/patterns/components/sub-page-toolbar';

export type {
  SubPageBreadcrumb,
  SubPagePager,
  SubPageSidebarToggle,
  SubPageTabItem,
} from '@mox-hub/patterns/components/sub-page-toolbar';

export function SubPageToolbar(props: ComponentProps<typeof PatternSubPageToolbar>) {
  const navigate = useNavigate();
  return (
    <PatternSubPageToolbar
      {...props}
      onBack={props.onBack ?? (() => navigate(-1))}
      renderLink={
        props.renderLink ??
        ((item, className, children) =>
          item.to ? (
            <Link to={item.to} className={className}>
              {children}
            </Link>
          ) : (
            <span className={className}>{children}</span>
          ))
      }
    />
  );
}
