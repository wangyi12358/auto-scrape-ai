# 任务 12：全站聚合分析

## 目标

提供「**总结全站**」操作：在 token 可控前提下，将多条接口的**摘要**（非全量 body）合并为一次模型调用，输出站点级业务流、主要模块、鉴权方式等。

## 范围

- **二次精炼**：每条请求仅保留 url 模式、method、状态码、内容类型、可选一行字段摘要；总长度上限 + 截断策略。
- UI：按钮、进度、流式结果区（可新 Tab 或抽屉）。
- 与单请求分析共用同一 AI 客户端，不同 system/user prompt。

## 不在此任务内

- 不把全量 response body 拼进聚合 Prompt（避免爆 context）。

## 验收清单

- [ ] 列表为空时按钮禁用并有提示。
- [ ] 请求数较多时仍能完成调用（靠摘要策略，而非无限拼接）。
- [ ] 结果可单独复制或导出为 Markdown（可选）。

## 依赖

- [11-prompt-templates-and-single-request-analysis.md](./11-prompt-templates-and-single-request-analysis.md)

## 产出物

- `lib/prompts/aggregate-site.ts` + Sidepanel 聚合 UI 区块。
