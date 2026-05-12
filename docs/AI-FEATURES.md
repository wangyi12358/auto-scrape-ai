# AI 功能说明

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      DevTools Panel                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 接口分析      │  │ 类型定义生成  │  │  代码生成    │      │
│  │ (已实现)      │  │ (已实现)      │  │  (待实现)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                    ┌──────▼───────┐                         │
│                    │  AI Gateway  │                         │
│                    │  (统一入口)   │                         │
│                    └──────┬───────┘                         │
└───────────────────────────┼─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ OpenAI  │       │ Claude  │       │ Ollama  │
    │ Compatible│      │ (扩展)  │       │ (本地)  │
    └─────────┘       └─────────┘       └─────────┘
```

## 已实现功能

### 1. 接口分析 (`analyzeCapturedRequest`)

**功能**: 根据请求/响应自动推断接口用途

**输入**:
- URL、HTTP 方法、状态码
- 请求体摘要（截断至 1200 字符）
- 响应体摘要（截断至 2800 字符）

**输出**:
```typescript
interface EndpointAnalysis {
  shortDescription: string;      // 一句话简述（纯文本）
  detailedDescription: string;   // 详细说明（Markdown）
}
```

**特性**:
- 同一 URL 路径的重复响应自动去重（节省 token）
- 并发队列控制（默认最多 2 路并行）
- 超时保护（默认 60 秒）

### 2. 类型定义生成 (`generateTypeDefinition`)

**功能**: 根据请求/响应生成数据类型定义

**支持语言**:
| 语言 | 说明 |
|------|------|
| `typescript` | TypeScript Interface |
| `go` | Go Struct（含 json tag） |
| `pydantic` | Pydantic BaseModel |

**输出**:
```typescript
interface TypeDefinitionResult {
  code: string;
  language: TypeDefinitionLanguage;
}
```

## 可扩展功能（待实现）

### 1. 代码片段生成

**功能**: 生成调用该接口的示例代码

已定义 `TargetLanguage` 类型，但尚未实现：
```typescript
type TargetLanguage = 'python' | 'go' | 'nodejs' | 'rust' | 'curl' | 'java' | 'csharp';
```

**实现思路**:
```typescript
export async function generateCodeSnippet(
  request: CapturedRequest,
  settings: ExtensionSettings,
  language: TargetLanguage,
): Promise<string> {
  // 使用 AI 生成对应语言的请求代码
}
```

### 2. OpenAPI 文档生成

**功能**: 将捕获的接口聚合为 OpenAPI 3.0 规范

**输出**: `openapi.yaml` 或 `openapi.json`

**用途**:
- 导入 Swagger UI 查看
- 生成 API 客户端 SDK
- 团队文档共享

### 3. Mock 数据生成

**功能**: 根据响应结构生成 Mock 数据

**用途**:
- 前端开发时模拟后端接口
- 测试环境数据填充

### 4. 测试用例生成

**功能**: 自动生成接口测试代码

**输出示例** (Python pytest):
```python
def test_get_users():
    response = requests.get("https://api.example.com/users")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "id" in data[0]
```

### 5. 安全性分析

**功能**: 检测潜在安全问题

**检查项**:
- 敏感信息泄露（API Key、Token、密码）
- 缺少认证的接口
- CORS 配置问题
- SQL 注入风险（基于 URL 参数模式）

### 6. 性能分析建议

**功能**: 基于响应时间和大小给出优化建议

**建议项**:
- 响应过大 → 建议分页
- 响应过慢 → 建议缓存
- 重复请求 → 建议去重

## MCP Tools 集成方案

[MCP (Model Context Protocol)](https://modelcontextprotocol.io/) 是 Anthropic 推出的开放协议，允许 AI 模型调用外部工具。

### 可接入的 MCP 场景

#### 1. 数据库查询工具
```typescript
// 当分析涉及数据库的接口时，可以查询实际表结构
const dbSchema = await mcp.tools.query({
  tool: "database-schema",
  params: { table: "users" }
});
```

#### 2. API 文档搜索
```typescript
// 搜索现有的 API 文档
const docs = await mcp.tools.search({
  tool: "api-docs",
  params: { keyword: "用户认证" }
});
```

#### 3. 代码仓库搜索
```typescript
// 搜索项目中相关代码
const code = await mcp.tools.search({
  tool: "codebase",
  params: { pattern: "getUserById" }
});
```

### MCP 集成架构

```
┌─────────────────────────────────────────────────────────┐
│                    Auto Scrape AI                        │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 网络抓取    │───▶│  AI 分析    │───▶│  结果展示   │  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘  │
│                            │                            │
│                     ┌──────▼──────┐                     │
│                     │ MCP Client  │                     │
│                     └──────┬──────┘                     │
└────────────────────────────┼────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
     │ DB Tool │       │ Docs    │       │ Codebase│
     │         │       │ Tool    │       │ Tool    │
     └─────────┘       └─────────┘       └─────────┘
```

## 多模型支持方案

### 方案 1: Vercel AI SDK Provider 切换

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

function createAIProvider(settings: AiConnectionSettings) {
  switch (settings.provider) {
    case 'openai':
      return createOpenAI({ apiKey: settings.apiKey, baseURL: settings.baseUrl });
    case 'anthropic':
      return createAnthropic({ apiKey: settings.apiKey });
    case 'google':
      return createGoogleGenerativeAI({ apiKey: settings.apiKey });
    case 'ollama':
      return createOpenAI({ 
        apiKey: 'ollama', 
        baseURL: 'http://localhost:11434/v1' 
      });
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }
}
```

### 方案 2: 统一配置接口

```typescript
interface AiConnectionSettings {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  // 可选: 自定义 Headers
  headers?: Record<string, string>;
}
```

## 实现优先级建议

| 优先级 | 功能 | 难度 | 价值 |
|--------|------|------|------|
| ⭐⭐⭐ | 代码片段生成 | 低 | 高（已有类型定义） |
| ⭐⭐⭐ | 多模型支持 | 中 | 高（扩大用户群） |
| ⭐⭐ | OpenAPI 文档生成 | 中 | 中 |
| ⭐⭐ | Mock 数据生成 | 中 | 中 |
| ⭐ | MCP Tools 集成 | 高 | 中（依赖生态） |
| ⭐ | 测试用例生成 | 中 | 低 |
| ⭐ | 安全性分析 | 高 | 低（专业性强） |
