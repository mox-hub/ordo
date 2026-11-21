/**
 * FavoriteToggle —— 收藏星标行为测试（W4 迁移补位）
 *
 * 背景：PageHeader 迁 `@mox-hub/patterns` 后，收藏态属主从页头内置星标
 * 移到本仓 `shared/components/favorite-toggle`（页头只收 favorites 插槽）。
 * 原 page-header.test.tsx 中「aria-pressed 翻转 / favoriteId 隔离」两例
 * 随组件迁出删除，这里在真实属主上补回最小覆盖，不复制整套页头测试。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAppStore } from '@/infrastructure/store/app-store';
import { FavoriteToggle } from './favorite-toggle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderToggle(props: { favoriteId?: string; label: string; aiId?: string }) {
  return render(
    <MemoryRouter initialEntries={['/app/fallback-page']}>
      <FavoriteToggle {...props} />
    </MemoryRouter>,
  );
}

const toggleButton = () => screen.getByRole('button');

beforeEach(() => {
  useAppStore.setState({ favoritePages: [] });
});

describe('FavoriteToggle —— 收藏态（W4 补位）', () => {
  it('初始未收藏：aria-pressed=false，可访问名为 common.favorite', () => {
    renderToggle({ favoriteId: '/app/tasks', label: 'Tasks' });
    expect(toggleButton().getAttribute('aria-pressed')).toBe('false');
    expect(toggleButton().getAttribute('aria-label')).toBe('common.favorite');
  });

  it('点击后 aria-pressed 翻转并按 favoriteId + label 落库', () => {
    renderToggle({ favoriteId: '/app/tasks', label: 'Tasks' });
    fireEvent.click(toggleButton());
    expect(toggleButton().getAttribute('aria-pressed')).toBe('true');
    expect(toggleButton().getAttribute('aria-label')).toBe('common.unfavorite');
    expect(useAppStore.getState().favoritePages).toEqual([
      { path: '/app/tasks', label: 'Tasks' },
    ]);
  });

  it('再次点击取消收藏并移除条目', () => {
    useAppStore.setState({ favoritePages: [{ path: '/app/tasks', label: 'Tasks' }] });
    renderToggle({ favoriteId: '/app/tasks', label: 'Tasks' });
    expect(toggleButton().getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggleButton());
    expect(toggleButton().getAttribute('aria-pressed')).toBe('false');
    expect(useAppStore.getState().favoritePages).toEqual([]);
  });

  it('收藏态按 favoriteId 隔离：不同页面互不影响', () => {
    render(
      <MemoryRouter initialEntries={['/app/tasks']}>
        <FavoriteToggle favoriteId="/app/tasks" label="Tasks" />
        <FavoriteToggle favoriteId="/app/bugs" label="Bugs" />
      </MemoryRouter>,
    );
    const [tasks, bugs] = screen.getAllByRole('button');
    fireEvent.click(tasks);
    expect(tasks.getAttribute('aria-pressed')).toBe('true');
    expect(bugs.getAttribute('aria-pressed')).toBe('false');
    expect(useAppStore.getState().favoritePages).toEqual([
      { path: '/app/tasks', label: 'Tasks' },
    ]);
  });

  it('未传 favoriteId 时回退当前路由 path 作收藏键', () => {
    renderToggle({ label: 'Fallback' });
    fireEvent.click(toggleButton());
    expect(useAppStore.getState().favoritePages).toEqual([
      { path: '/app/fallback-page', label: 'Fallback' },
    ]);
  });

  it('aiId 透传 data-ai 钩子（页头委托渲染口径）', () => {
    renderToggle({ favoriteId: '/app/tasks', label: 'Tasks', aiId: 'tasks.list' });
    expect(toggleButton().getAttribute('data-ai-component')).toBe('tasks.list.favorite-button');
    expect(toggleButton().getAttribute('data-ai-action')).toBe('tasks.list.favorite-button.click');
  });
});
