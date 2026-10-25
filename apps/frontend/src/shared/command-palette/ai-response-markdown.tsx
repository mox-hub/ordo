import ReactMarkdown from 'react-markdown';

/**
 * 命令面板 AI 问答回答的 markdown 渲染懒岛（启动提速批）：
 * provider 静态 import react-markdown 会把 remark 全链拖进入口 chunk，
 * 而 markdown 只在「打开面板且 AI 回答就绪」时才真正需要——拆到独立模块
 * 经 lazy 引入，未加载时由消费方回落纯文本展示，零阻塞。
 */
export function AiResponseMarkdown({ text }: { text: string }) {
  return <ReactMarkdown>{text}</ReactMarkdown>;
}
