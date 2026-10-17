import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppButton, AppText, Chip, TextField } from '../../src/components/primitives';
import { StaticRow } from '../../src/components/list';
import { AsyncBoundary, Screen, SectionTitle } from '../../src/components/screen';
import { useDecisionById, useResolveDecision } from '../../src/modules/decisions/api';
import {
  isDecisionActionable,
  type DecisionAction,
  type DecisionItem,
} from '../../src/modules/decisions/resolve';
import { t, type I18nKey } from '../../src/i18n';
import { formatDateTime } from '../../src/lib/format';
import { spacing } from '../../src/theme/tokens';

function decisionKindKey(kind: string): I18nKey {
  const candidate = `decision.kind.${kind}` as I18nKey;
  return t(candidate) === candidate ? 'decision.kind.proposal' : candidate;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <StaticRow>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <AppText variant="bodySm" color="textMuted">
          {label}
        </AppText>
        <AppText variant="bodySm" color="textSecondary" style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </AppText>
      </View>
    </StaticRow>
  );
}

export default function DecisionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const decisionQ = useDecisionById(id);
  const resolve = useResolveDecision();
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const decision = decisionQ.data as DecisionItem | null;
  const actionable = decision ? isDecisionActionable(decision) : false;

  async function act(action: DecisionAction) {
    if (!decision) return;
    if (action === 'reject' && !reason.trim()) {
      setFeedback(t('decision.reason'));
      return;
    }
    setFeedback(null);
    try {
      await resolve.mutateAsync({ decision, action, reason: reason.trim() });
      // 拍板成功即从队列移除（spike 判据 4 收尾）
      router.back();
    } catch {
      setFeedback(t('decision.resolveFailed'));
    }
  }

  return (
    <Screen scroll padded>
      <AsyncBoundary
        loading={decisionQ.isLoading}
        error={decisionQ.error}
        retry={() => void decisionQ.refetch()}
        isEmpty={!decisionQ.isLoading && !decision}
        emptyText={t('decision.notFound')}
      >
        {decision ? (
          <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Chip label={t(decisionKindKey(decision.kind))} tone="primary" />
              <Chip
                label={
                  t(
                    decision.urgency === 'blocking'
                      ? 'decision.urgency.blocking'
                      : 'decision.urgency.advisory',
                  )
                }
                tone={decision.urgency === 'blocking' ? 'danger' : 'neutral'}
              />
            </View>

            <AppText variant="headline" weight="semibold">
              {decision.title}
            </AppText>
            {decision.detail ? (
              <AppText color="textSecondary">{decision.detail}</AppText>
            ) : null}

            <SectionTitle />
            <View style={{ gap: spacing.sm }}>
              {decision.projectName ? (
                <MetaRow label={t('me.workspace')} value={decision.projectName} />
              ) : null}
              {decision.taskTitle ? <MetaRow label={t('issues.title')} value={decision.taskTitle} /> : null}
              {decision.riskLevel ? <MetaRow label="risk" value={decision.riskLevel} /> : null}
              <MetaRow label="createdAt" value={formatDateTime(decision.createdAt)} />
            </View>

            {actionable ? (
              <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                <TextField label={t('decision.reason')} value={reason} onChangeText={setReason} />
                {feedback ? (
                  <AppText variant="bodySm" color="danger">
                    {feedback}
                  </AppText>
                ) : null}
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label={t('decision.approve')}
                      onPress={() => void act('approve')}
                      loading={resolve.isPending}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label={t('decision.reject')}
                      variant="danger"
                      onPress={() => void act('reject')}
                      loading={resolve.isPending}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <StaticRow style={{ marginTop: spacing.md }}>
                <AppText variant="bodySm" color="textSecondary">
                  {decision.contentFingerprint
                    ? t('decision.readOnlyDesktop')
                    : t('decision.fingerprintMissing')}
                </AppText>
              </StaticRow>
            )}
          </View>
        ) : null}
      </AsyncBoundary>
    </Screen>
  );
}
