/**
 * MemberCreateDialog - 新建/编辑成员弹窗（批四·FormDialog 标准化迁移件 8/8）
 *
 * 裸 useState 17 字段 → semantic/form-dialog（RHF+Zod §13.1）；AI 成员的
 * aiModelConfigId 条件必填与 server member.service 硬校验对齐（superRefine）。
 * 类型分叉字段组（human: 关联 User/电话/时区/日费率；ai_agent: 模型/提示词/
 * 思考强度/CLI/执行角色）保持原分组视觉；内联中文文案为存量债务，i18n 全量化另批。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarPickerField } from '@/components/ui/avatar-picker-field';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/semantic/form-dialog';
import { toast } from '@/components/ui/toast';
import { useCreateMember, useUpdateMember } from '../hooks';
import { MEMBER_THINKING_LEVELS, MEMBER_TRUST_TIERS, type Member, type ThinkingLevel } from '../types';
import { api } from '@/infrastructure/api-client';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';
import { useProjectRoles } from '@/modules/project-role';
import { mcpServersApi } from '@/modules/mcp-server/api/mcp-servers-api';

const memberSchema = z.object({
  type: z.enum(['human', 'ai_agent']),
  displayName: z.string().min(1, '请输入显示名'),
  handle: z.string().min(1, '请输入 @handle'),
  email: z.string().optional(),
  avatarUrl: z.string().nullable(),
  title: z.string().optional(),
  description: z.string().optional(),
  trustLevel: z.string().optional(),
  userId: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  costRatePerDay: z.string().optional(),
  aiModelConfigId: z.string().optional(),
  personalPrompt: z.string().optional(),
  thinkingLevel: z.string().optional(),
  tagsInput: z.string().optional(),
  defaultCliProviderId: z.string().optional(),
  defaultExecutionRole: z.string().optional(),
}).superRefine((values, ctx) => {
  // 与 server member.service 硬校验对齐：AI 成员必须绑定模型
  if (values.type === 'ai_agent' && !values.aiModelConfigId) {
    ctx.addIssue({ code: 'custom', path: ['aiModelConfigId'], message: '请选择 AI 模型' });
  }
});

type MemberFormValues = z.infer<typeof memberSchema>;

export interface MemberCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (member: Member) => void;
  defaultType?: 'human' | 'ai_agent';
  defaultProjectId?: string;
  /** 传入即为编辑模式（预填并 PATCH 更新），类型与账号关联不可改 */
  member?: Member | null;
}

// 注: ai-hub API 的 AIModel 类型见 ai-hub/api/ai-hub-api.ts

export function MemberCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType = 'human',
  defaultProjectId,
  member = null,
}: MemberCreateDialogProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(member);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  // type 分叉：Tabs 驱动（编辑态锁定）；提交前经 form.setValue 同步进表单值
  const [type, setType] = useState<'human' | 'ai_agent'>(member?.type === 'ai_agent' ? 'ai_agent' : defaultType);

  const { data: aiModels } = useQuery({
    queryKey: ['ai-models-list'],
    queryFn: () => aiHubApi.getModels(),
    enabled: open && type === 'ai_agent',
    staleTime: 60 * 1000,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list-for-member'],
    queryFn: async () => {
      return api.get<Array<{ id: string; username: string; displayName: string; email: string }>>('/users');
    },
    enabled: open && type === 'human',
    staleTime: 60 * 1000,
  });

  // CLI provider 列表（仅 AI 员工显示）
  const { data: cliProvidersRes } = useQuery({
    queryKey: ['cli-providers-for-member'],
    queryFn: () => mcpServersApi.listCliProviders(),
    enabled: open && type === 'ai_agent',
    staleTime: 60 * 1000,
  });
  const cliProviders = cliProvidersRes?.providers ?? [];

  // 项目级角色 + 全局模板（仅 AI 员工显示）
  const { data: projectRolesData } = useProjectRoles(
    defaultProjectId && type === 'ai_agent' ? defaultProjectId : undefined,
  );
  const executionRoleOptions = [
    ...(projectRolesData?.globalRoles ?? []),
    ...(projectRolesData?.projectRoles ?? []),
  ];

  return (
    <FormDialog<MemberFormValues>
      open={open}
      onOpenChange={(next) => {
        if (!next) setType(member?.type === 'ai_agent' ? 'ai_agent' : defaultType);
        onOpenChange(next);
      }}
      title={isEdit ? '编辑成员' : '新建成员'}
      description={isEdit ? '更新成员资料，类型与账号关联不可修改。' : '创建团队成员，支持人类与 AI 成员。'}
      schema={memberSchema}
      defaultValues={{
        type: member?.type === 'ai_agent' ? 'ai_agent' : defaultType,
        displayName: member?.displayName ?? '',
        handle: member?.handle ?? '',
        email: member?.email ?? '',
        avatarUrl: member?.avatarUrl ?? null,
        title: member?.title ?? '',
        description: member?.description ?? '',
        trustLevel:
          member?.trustLevel === null || member?.trustLevel === undefined ? '' : String(member.trustLevel),
        userId: member?.userId ?? '',
        phone: member?.phone ?? '',
        timezone: member?.timezone ?? 'Asia/Shanghai',
        costRatePerDay: member?.costRatePerDay ? String(member.costRatePerDay / 100) : '',
        aiModelConfigId: member?.aiModelConfigId ?? '',
        personalPrompt: member?.personalPrompt ?? '',
        thinkingLevel: member?.thinkingLevel ?? '',
        tagsInput: Array.isArray(member?.tags) ? member.tags.join(', ') : '',
        defaultCliProviderId: member?.defaultCliProviderId ?? '',
        defaultExecutionRole: member?.defaultExecutionRole ?? '',
      }}
      submitLabel={isEdit ? '保存修改' : '创建成员'}
      submitting={createMember.isPending || updateMember.isPending}
      onSubmit={async (values) => {
        const payload: Partial<Member> = {
          type: values.type,
          displayName: values.displayName,
          handle: values.handle,
          email: values.email || undefined,
          avatarUrl: values.avatarUrl || undefined,
          title: values.title || undefined,
          description: values.description || undefined,
          trustLevel: values.trustLevel === '' ? undefined : Number(values.trustLevel),
          tags: values.tagsInput
            ? values.tagsInput.split(',').map((tg) => tg.trim()).filter(Boolean)
            : undefined,
        };
        if (values.type === 'human') {
          payload.userId = values.userId || undefined;
          payload.costRatePerDay =
            values.costRatePerDay === '' ? undefined : Math.round(Number(values.costRatePerDay) * 100);
          // Member 模型没有 phone/timezone 列；member-card.service 从 metadata 读取这两个字段
          const meta: Record<string, string> = {};
          if (values.phone) meta.phone = values.phone;
          if (values.timezone) meta.timezone = values.timezone;
          payload.metadata = Object.keys(meta).length ? meta : undefined;
        } else {
          payload.aiModelConfigId = values.aiModelConfigId || undefined;
          payload.personalPrompt = values.personalPrompt || undefined;
          payload.thinkingLevel = (values.thinkingLevel || undefined) as ThinkingLevel | undefined;
          payload.defaultCliProviderId = values.defaultCliProviderId || undefined;
          payload.defaultExecutionRole = values.defaultExecutionRole || undefined;
        }
        try {
          const saved = isEdit && member
            ? await updateMember.mutateAsync({ id: member.id, data: payload })
            : await createMember.mutateAsync(payload);
          onSuccess?.(saved);
        } catch (err) {
          console.error('Save member failed', err);
          toast.error(isEdit ? '更新成员失败' : '创建成员失败');
          throw err; // 失败不关窗
        }
      }}
      fields={(form) => (
        <>
          <Tabs
            value={type}
            onValueChange={(v) => {
              const next = v as 'human' | 'ai_agent';
              setType(next);
              form.setValue('type', next);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="human" disabled={isEdit}>人类成员</TabsTrigger>
              <TabsTrigger value="ai_agent" disabled={isEdit}>AI 成员</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>显示名 *</FormLabel>
                  <FormControl>
                    <Input placeholder="如: 张开发" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>@handle *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="如: zhang-dev"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>头像</FormLabel>
                <FormControl>
                  <AvatarPickerField
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? null)}
                    memberType={type === 'ai_agent' ? 'ai' : 'human'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>职务</FormLabel>
                  <FormControl>
                    <Input placeholder="如: 前端工程师" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trustLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>信任等级</FormLabel>
                  <FormControl>
                    <select
                      className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    >
                      <option value="">{t('trust.unrated', '未评估')}</option>
                      {MEMBER_TRUST_TIERS.map((tier) => (
                        <option key={tier.level} value={tier.level}>
                          {t(tier.labelKey)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@example.com" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tagsInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>标签（逗号分隔）</FormLabel>
                <FormControl>
                  <Input placeholder="如: frontend, expert" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>描述</FormLabel>
                <FormControl>
                  <Input placeholder="简短描述成员背景或职责" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {type === 'human' ? (
            <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
              <div className="text-xs font-semibold text-muted-foreground">人类成员</div>
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关联 User</FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm disabled:opacity-50"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        disabled={isEdit}
                      >
                        <option value="">不关联（独立人类）</option>
                        {users?.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName} (@{u.username})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>电话</FormLabel>
                      <FormControl>
                        <Input placeholder="+86-..." {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>时区</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="costRatePerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>日费率（元/天，用于团队人天成本统计）</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="50" placeholder="如: 1500" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-border p-3 bg-accent-purple/5">
              <div className="text-xs font-semibold text-accent-purple">AI 成员</div>
              <FormField
                control={form.control}
                name="aiModelConfigId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI 模型 *</FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      >
                        <option value="">选择 AI 模型</option>
                        {aiModels?.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.provider})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="personalPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>个人提示词（与所属角色的共享约定合并注入派发 prompt）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="该成员 AI 执行者的私有偏好与补充约定，如: 偏好简洁实现与充分测试..."
                        className="h-20 resize-none"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="thinkingLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>思考强度</FormLabel>
                      <FormControl>
                        <select
                          className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        >
                          <option value="">默认</option>
                          {MEMBER_THINKING_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultExecutionRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>默认执行角色</FormLabel>
                      <FormControl>
                        <select
                          className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        >
                          <option value="">不指定（按任务解析）</option>
                          {executionRoleOptions.map((r) => (
                            <option key={r.id} value={r.executionRole}>
                              {r.name} ({r.executionRole})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="defaultCliProviderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>默认 CLI Provider</FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      >
                        <option value="">不指定（按角色解析）</option>
                        {cliProviders.map((p) => (
                          <option
                            key={p.providerId}
                            value={p.providerId}
                            disabled={!p.enabled}
                          >
                            {p.providerId}
                            {p.enabled ? ' · 可用' : ' · 已禁用'}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </>
      )}
    />
  );
}
