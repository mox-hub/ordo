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

/**
 * CAP-A-25 跨工作区主体落地 e2e（GAP-T-57 ①③⑤）：
 * 用户只在 A 工作区注册 → 在 B 工作区被邀请 → 接受时由服务端把主体写进 B 库
 * → 之后可在 B 登录。全程真实双库实例（template.db 各复制一份），不 mock 数据层。
 */
describe('Workspace subject provisioning (e2e) — CAP-A-25', () => {
  let app: INestApplication;
  let wsA: IsolatedWorkspace;
  let wsB: IsolatedWorkspace;
  let httpA: WsRequest;
  let httpB: WsRequest;

  const userEmail = 'cross-workspace@example.com';
  const userPassword = 'cross-workspace-pass-1';
  let userToken = '';
  let userId = '';
  let adminBToken = '';
  let teamId = '';
  let inviteToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    wsA = createIsolatedWorkspace('Subject cross A');
    wsB = createIsolatedWorkspace('Subject cross B');
    httpA = wsRequest(app, wsA.id);
    httpB = wsRequest(app, wsB.id);

    // B 工作区管理员（模板库预置 admin）：建团队、发邀请
    const adminB = await httpB.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    expect([200, 201]).toContain(adminB.status);
    adminBToken = adminB.body.data.accessToken;

    const team = await httpB
      .post('/_api/teams')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ name: 'B 工作区团队', slug: 'b-workspace-team' });
    expect(team.status).toBe(201);
    teamId = team.body.data.id;

    // 只在 A 工作区注册：此时 B 库中不存在该主体
    const cfg = await httpA.get('/_api/auth/public-config');
    const mode = cfg.body.data?.registrationMode ?? 'open';
    let registrationInvite: string | undefined;
    if (mode !== 'open') {
      const adminA = await httpA.post('/_api/auth/login').send({
        username: 'admin',
        password: 'password123',
      });
      const inviteA = await httpA
        .post('/_api/admin/invites')
        .set('Authorization', `Bearer ${adminA.body.data.accessToken}`)
        .send({ email: userEmail });
      expect(inviteA.status).toBe(201);
      registrationInvite = inviteA.body.data.token;
    }

    const registered = await httpA.post('/_api/auth/register').send({
      email: userEmail,
      password: userPassword,
      displayName: '跨库用户',
      ...(registrationInvite ? { inviteToken: registrationInvite } : {}),
    });
    expect(registered.status).toBe(201);
    userToken = registered.body.data.accessToken;
    userId = registered.body.data.user.id;
  });

  afterAll(async () => {
    await app.close();
    await wsA.cleanup();
    await wsB.cleanup();
  });

  it('前提：主体只在 A 库，B 库查无此人', async () => {
    expect(
      (await wsA.db.user.findUnique({ where: { id: userId } }))?.email,
    ).toBe(userEmail);
    expect(await wsB.db.user.findUnique({ where: { id: userId } })).toBeNull();
  });

  it('③ 未落地态：在 B 登录（密码正确）→ 401 WORKSPACE_SUBJECT_MISSING', async () => {
    const res = await httpB.post('/_api/auth/login').send({
      username: userEmail,
      password: userPassword,
    });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('WORKSPACE_SUBJECT_MISSING');
  });

  it('③ 不引入枚举面：密码错误仍为 INVALID_CREDENTIALS', async () => {
    const res = await httpB.post('/_api/auth/login').send({
      username: userEmail,
      password: 'definitely-wrong-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('① 接受邀请（在 A 的登录态下）→ 主体写入 B 库并建立 Member/TeamMember', async () => {
    const created = await httpB
      .post(`/_api/teams/${teamId}/invites`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ email: userEmail, role: 'member' });
    expect(created.status).toBe(201);
    inviteToken = created.body.data.token;
    expect(inviteToken).toBeTruthy();

    // 令牌存在于 B 库；接受请求由 A 库的登录态发起（守卫在 A 校验）
    const accepted = await httpA
      .post(`/_api/invites/${inviteToken}/accept`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(accepted.status).toBe(201);

    const mirrored = await wsB.db.user.findUnique({ where: { id: userId } });
    expect(mirrored).not.toBeNull();
    expect(mirrored?.email).toBe(userEmail);
    expect(mirrored?.passwordHash).toBeTruthy();

    const member = await wsB.db.member.findFirst({
      where: { userId },
      select: { id: true },
    });
    expect(member).not.toBeNull();
    expect(
      await wsB.db.teamMember.findFirst({
        where: { teamId, memberId: member!.id },
      }),
    ).not.toBeNull();
    expect(
      (await wsB.db.teamInvite.findUnique({ where: { token: inviteToken } }))
        ?.status,
    ).toBe('accepted');
  });

  it('① 落地后可在 B 登录并读取 /auth/me', async () => {
    const login = await httpB.post('/_api/auth/login').send({
      username: userEmail,
      password: userPassword,
    });
    expect([200, 201]).toContain(login.status);
    const tokenB = login.body.data.accessToken;

    const me = await httpB
      .get('/_api/auth/me')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user?.id).toBe(userId);
    expect(me.body.data.user?.email).toBe(userEmail);
  });

  it('幂等：重复接受同一邀请 → 不造第二个主体', async () => {
    const again = await httpA
      .post(`/_api/invites/${inviteToken}/accept`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    // 邀请已核销 → 400；关键是 B 库仍只有一行该主体
    expect(again.status).toBe(400);
    expect(await wsB.db.user.count({ where: { email: userEmail } })).toBe(1);
  });

  it('⑤ 回归：未知 x-workspace-id 不回落默认库 → 404 WORKSPACE_NOT_FOUND', async () => {
    const bogus = wsRequest(app, 'ws-not-registered');
    const res = await bogus
      .get('/_api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error?.code ?? res.body.code).toBe('WORKSPACE_NOT_FOUND');
  });
});
