import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { createProjectFixture } from './helpers/fixtures';

/**
 * CAP-C-04 决策拍板链路 e2e（收件箱合并进通知中心后的回归证据）：
 * 提案创建 → pending 聚合列表可见（含 contentFingerprint）→ 指纹强校验 409
 * → accept（clarify：answer 留痕零副作用）→ reject（reason 必填）。
 * 服务端写路径与 /decisions/pending 投影是通知中心收件箱的同一真相源，
 * 此处回归即「合并承载面后拍板全链」的证据。
 */
describe('Decision 拍板链路（e2e）', () => {
  let app: INestApplication;
  let accessToken: string;
  let projectId: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Decision e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'Decision 拍板回归项目',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  it('创建 clarify 提案 → pending 列表可见且携带内容指纹', async () => {
    const createRes = await wsHttp
      .post('/_api/decisions/proposals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        kind: 'clarify',
        title: '拍板回归：导出格式用 CSV 还是 Excel？',
        payload: {
          question: '导出格式用 CSV 还是 Excel？',
          options: ['CSV', 'Excel'],
        },
        projectId,
      });
    expect(createRes.status).toBe(201);
    const proposalId: string = createRes.body.data.id;
    expect(proposalId).toBeTruthy();

    const listRes = await wsHttp
      .get(`/_api/decisions/pending?projectId=${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const items = listRes.body.data.items as Array<Record<string, unknown>>;
    const mine = items.find((i) => i.sourceId === proposalId);
    expect(mine).toBeTruthy();
    expect(mine!.id).toBe(`clarify:${proposalId}`);
    expect(mine!.status).toBe('pending');
    expect(typeof mine!.contentFingerprint).toBe('string');
    expect((mine!.contentFingerprint as string).length).toBeGreaterThan(0);

    // 指纹强校验：所见≠所批 → 409（CAP-C-04 批准绑定内容指纹）
    const staleRes = await wsHttp
      .post(`/_api/decisions/proposals/${proposalId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        action: 'accept',
        answer: 'CSV',
        expectedFingerprint: 'deadbeef',
      });
    expect(staleRes.status).toBe(409);

    // 携带正确指纹 accept：clarify 无领域副作用，answer 随 resolution 留痕
    const acceptRes = await wsHttp
      .post(`/_api/decisions/proposals/${proposalId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        action: 'accept',
        answer: 'CSV',
        expectedFingerprint: mine!.contentFingerprint,
      });
    expect(acceptRes.status).toBe(201); // @Post 默认 201（@ApiResponse 仅文档）
    expect(acceptRes.body.data.status).toBe('accepted');

    // 拍板后从待决列表消失
    const afterList = await wsHttp
      .get(`/_api/decisions/pending?projectId=${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const afterItems = afterList.body.data.items as Array<
      Record<string, unknown>
    >;
    expect(afterItems.some((i) => i.sourceId === proposalId)).toBe(false);

    // 已决议提案不可重复拍板
    const reRes = await wsHttp
      .post(`/_api/decisions/proposals/${proposalId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ action: 'accept', answer: 'CSV' });
    expect(reRes.status).toBe(400);
  });

  it('reject 拍板：reason 必填校验 + 驳回留痕', async () => {
    const createRes = await wsHttp
      .post('/_api/decisions/proposals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        kind: 'plan',
        title: '拍板回归：驳回路径',
        payload: { summary: '回归用驳回提案' },
        projectId,
      });
    expect(createRes.status).toBe(201);
    const proposalId: string = createRes.body.data.id;

    // reject 缺 reason → 400
    const noReason = await wsHttp
      .post(`/_api/decisions/proposals/${proposalId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ action: 'reject' });
    expect(noReason.status).toBe(400);

    const rejectRes = await wsHttp
      .post(`/_api/decisions/proposals/${proposalId}/resolve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ action: 'reject', reason: '方案证据不足，先补评估' });
    expect(rejectRes.status).toBe(201);
    expect(rejectRes.body.data.status).toBe('rejected');
  });

  it('summary 计数随拍板回落（收件箱徽标数据源）', async () => {
    const res = await wsHttp
      .get(`/_api/decisions/summary?projectId=${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const data = res.body.data;
    expect(data).toBeTruthy();
    expect(data.pending).toBe(0);
    expect(data.byKind).toBeTruthy();
  });
});
