# 任务 01：工程基线（目录、Manifest、权限）

## 目标

为后续模块划定**固定目录**与 **Manifest V3** 能力边界，避免后期大范围改动路径或权限。

## 范围

- 在仓库内约定：`lib/`（纯逻辑）、`entrypoints/`（WXT 入口）、`components/`（可选，React 复用组件）。
- 在 `wxt.config` / `package.json` 中确认：React、TypeScript、`compile` 脚本可用。
- **权限初稿**（可随任务 05–07 微调，但需先有清单）：
  - `storage`（配置与持久化）
  - `sidePanel`（Sidepanel）
  - `devtools_page`（网络采集）
  - 若 AI 从扩展内直连公网：`host_permissions` 或等价配置（具体以任务 10 为准）

## 不在此任务内

- 不写业务 UI 与 AI 调用。
- 不实现真实网络监听（任务 06）。

## 验收清单

- [x] `pnpm compile`（或项目等价命令）无 TypeScript 错误。
- [x] 文档或代码注释中写清：**网络 body 仅能在 DevTools 上下文可靠获取**，与 Sidepanel 的分工。
- [x] `manifest` 中已预留任务 05–13 所需权限的占位或注释说明。

## 依赖

无（首个任务）。

## 产出物

- 目录结构说明（可写在 `README` 或本任务完成后在 `docs/tasks/README` 中链接到实际结构）。
