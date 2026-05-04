# 任务 11：Prompt 模板与单请求分析闭环

## 目标

将 **RefinedRequest** + **Analysis Presets** 填入结构化 Prompt（角色、任务、输入、输出要求），调用任务 10 的流式接口，并把结果解析/展示到任务 09 的三 Tab（可先整体 Markdown，再拆字段）。

## 范围

- Prompt 模板版本号（便于以后迭代不改存储格式）。
- 输出约定：功能一句话、TS Interface（或按 `schemaType` 切换）、爬虫建议（动态参数、Cookie）。
- 将流式结果写入 Store：`documentation`、`schemaSnippet`、`sampleCode`（字段名以任务 02 为准）。
- 单请求「分析」按钮：同一请求重复分析覆盖或版本化（需产品决策，文档写清默认）。

## 不在此任务内

- 全站聚合（任务 12）。
- 多语言 Provider（任务 14）。

## 验收清单

- [ ] 选中一条请求后点击分析，三 Tab 均有合理内容（允许先同一原文重复显示，再优化拆分）。
- [ ] Prompt 中不含完整 Cookie 与已剔除的敏感头（与 Refiner 一致）。
- [ ] 切换 `schemaType` / `targetLanguage` 后再分析，输出随之变化。

## 依赖

- [03-filter-engine-and-refiner.md](./03-filter-engine-and-refiner.md)
- [09-request-list-and-detail-tabs.md](./09-request-list-and-detail-tabs.md)
- [10-ai-sdk-integration-streaming.md](./10-ai-sdk-integration-streaming.md)

## 产出物

- `lib/prompts/analyze-request.ts`（或按版本 `v1.ts`）+ Store 字段扩展。
