-- RemotePullRequest.headBranch 索引（CAP-B-08 二期余留清偿，2026-10-30）：
-- check_run 证据回流按 headBranch 反查 PR（github-evidence.subscriber），此前全表扫。
-- 手插迁移三步法（本仓迁移历史不可重放，migrate dev 非交互空转——沿 20261011 先例）。
-- CreateIndex
CREATE INDEX "idx_remote_pull_requests_head_branch" ON "RemotePullRequest"("headBranch");
