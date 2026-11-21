/**
 * AssistantColleagueSlot —— 主仓 hook/router/i18n 适配层。
 *
 * 展示实现已迁至 @mox-hub/patterns；本文件注入 assistant status、办公室路由
 * 与 react-i18next 文案，保留既有行为。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AssistantColleagueSlot as PatternAssistantColleagueSlot } from '@mox-hub/patterns/components/assistant-colleague-slot';
import { useAssistantStatus } from '../hooks/use-assistant-status';

export function AssistantColleagueSlot({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useAssistantStatus();

  return (
    <PatternAssistantColleagueSlot
      collapsed={collapsed}
      state={status.state}
      pending={status.pending}
      personaName={t('assistant.personaName')}
      onOpen={() => navigate('/app/office')}
      labels={{
        open: t('assistant.colleague.open'),
        status: {
          needYou: t('assistant.status.needYou'),
          working: t('assistant.status.working'),
          suggestions: t('assistant.status.suggestions'),
          idle: t('assistant.status.idle'),
        },
      }}
    />
  );
}
