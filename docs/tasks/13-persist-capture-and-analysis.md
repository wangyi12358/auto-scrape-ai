# 任务 13：持久化（捕获与分析）

## 目标

防止刷新 Sidepanel 或重启浏览器后数据丢失：将**配置**（任务 04）、**当前会话捕获列表**（可选）、**每条请求的分析结果**持久化；定义清除会话与导出策略。

## 范围

- Storage 分区：`settings`、`session`（录制会话元数据）、`analyses`（按 requestId 或 hash 索引）。
- 大小控制：超出 `storage` 配额时的降级（只保留最近 N 条、或只保留摘要）。
- 启动时 hydration 到 Store；与任务 07 新事件合并策略（以服务端时间戳或单调 id 为准）。

## 不在此任务内

- 跨设备同步（`sync` 配额与隐私需单独评审）。

## 验收清单

- [ ] 关闭 Sidepanel 再打开，列表与上次分析结果仍在（在约定策略内）。
- [ ] 提供「清空当前会话」入口。
- [ ] 文档说明敏感数据是否落盘及用户如何清除。

## 依赖

- [08-sidepanel-shell-and-store.md](./08-sidepanel-shell-and-store.md)
- [11-prompt-templates-and-single-request-analysis.md](./11-prompt-templates-and-single-request-analysis.md)

## 产出物

- `lib/storage/session.ts`、`lib/storage/analyses.ts`（命名可调）。
