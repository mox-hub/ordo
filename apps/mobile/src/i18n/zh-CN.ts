/**
 * zh-CN 词典（移动端独立副本——工程接入方案 §六：键集口径与前端一致，
 * 文案为移动端自有，后续 CI 加 i18n 键集对齐检查）。
 */
export const zhCN = {
  'common.retry': '重试',
  'common.loading': '加载中…',
  'common.empty': '暂无内容',
  'common.cancel': '取消',
  'common.confirm': '确认',
  'common.logout': '退出登录',
  'common.error': '出错了',
  'common.lastSyncAt': '最后同步 {time}',

  'auth.title': '登录 Ordo',
  'auth.subtitle': 'AI 驱动的项目管理——伴随式掌上治理台',
  'auth.username': '用户名',
  'auth.password': '密码',
  'auth.submit': '登录',
  'auth.submitting': '登录中…',

  'workspace.title': '选择工作区',
  'workspace.subtitle': '每个工作区是独立的数据库与项目空间',
  'workspace.empty': '未发现可用工作区',
  'workspace.activateFailed': '激活工作区失败',

  'tab.inbox': '收件箱',
  'tab.executions': '执行',
  'tab.issues': '工单',
  'tab.me': '我的',

  'inbox.title': '收件箱',
  'inbox.decisions': '待你决策',
  'inbox.notifications': '通知',
  'inbox.unreadCount': '{count} 条未读',
  'inbox.decisionQueueEmpty': '没有待决决策',

  'decision.kind.approval': '审批',
  'decision.kind.proposal': '提案',
  'decision.kind.contract_conflict': '契约冲突',
  'decision.kind.acceptance': '验收',
  'decision.kind.plan': '计划',
  'decision.kind.assignment': '指派',
  'decision.kind.resolution': '决议',
  'decision.kind.spend': '支出',
  'decision.kind.clarify': '澄清',
  'decision.kind.gate': '门禁',
  'decision.kind.workflow_def': '工作流定义',
  'decision.kind.release': '发版',
  'decision.kind.integration': '集成',
  'decision.urgency.blocking': '阻塞',
  'decision.urgency.advisory': '知会',
  'decision.approve': '同意',
  'decision.reject': '驳回',
  'decision.reason': '理由（驳回必填）',
  'decision.readOnlyDesktop': '该决策类型无移动端写路径，请回桌面处理',
  'decision.fingerprintMissing': '缺少内容指纹，为守住决策红线请回桌面拍板',
  'decision.resolved': '已提交决议',
  'decision.resolveFailed': '决议提交失败',
  'decision.notFound': '决策不存在或已完成',

  'notifications.title': '通知详情',
  'notifications.notFound': '通知不存在或已过期',

  'executions.title': '执行',
  'executions.detail': '执行详情',
  'executions.stepsCount': '{count} 个步骤',
  'executions.artifactsCount': '{count} 个产物',
  'executions.events': '事件流',
  'executions.retry': '重试执行',
  'executions.cancel': '取消执行',
  'executions.offlineBanner': '实时连接已断开，显示的是最后同步结果',

  'issues.title': '工单',
  'issues.detail': '工单详情',
  'issues.description': '描述',
  'issues.assignee': '负责人',
  'issues.unassigned': '未指派',
  'issues.new': '发起需求',
  'issues.newPlaceholder': '一期 MVP 未含发起需求，从 M3 起分批交付',

  'me.title': '我的',
  'me.workspace': '当前工作区',
  'me.about': '关于 Ordo',
  'me.preferences': '通知偏好',
  'me.preferencesReadonly': '移动端只读，编辑请回桌面',

  'about.title': '关于',
  'about.version': '应用版本',
  'about.backend': '后端地址',
  'about.workspace': '工作区',
} as const;

export type I18nKey = keyof typeof zhCN;
