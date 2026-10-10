# Agent Support Copilot

一个面向订单支持场景的全栈 Agent 项目。它把“生产级 Agent”需要展示的关键链路放在一个可运行的最小系统里：意图路由、工具调用、会话记忆、知识库检索、外部状态变更确认、审计追踪、前端交互和自动化测试。

## 能力演示

- 订单查询：识别 `ORD-1001` 这类订单号，调用订单工具并返回状态。
- 政策检索：从本地知识库检索退款、安全和订单流程，返回来源标识。
- 人工工单：涉及外部状态变更时先生成待确认动作，用户明确确认后才创建工单。
- 会话记忆：保留最近 20 条消息，并根据关键词选择相关上下文。
- 可观测性：每次请求生成 `traceId`，记录计划、工具调用、工具结果和回答步骤。
- 浏览器界面：支持快捷问题、聊天、服务健康检查和工单确认。

## 前后端一体化展示

这个项目用一个 Node.js 进程同时提供前端页面和后端 API，打开浏览器就能看到完整链路：

```text
浏览器页面
   ├─ GET /                 加载 HTML / CSS / JS
   ├─ POST /api/chat        调用 Agent、工具和知识库
   ├─ POST /api/confirm     用户确认后创建人工工单
   └─ GET /api/health       检查后端服务状态
```

启动后访问 `http://localhost:8787`，点击“订单状态”“退款规则”或“人工工单”即可演示前端交互、后端路由、Agent 决策和工具调用。项目不依赖数据库或第三方服务，招聘方可以直接运行查看。

## 架构

```text
Browser UI
   │ JSON API
Node.js HTTP API ── SupportAgent ── ToolRegistry
                         │             ├─ knowledge base
                         │             ├─ order service adapter
                         │             └─ ticket service adapter
                         └─ ConversationMemory + audit steps
```

当前版本使用无依赖的 Node.js 运行时，方便招聘方直接启动查看；工具接口和模型适配器已经独立。默认离线运行，配置 `MODEL_BASE_URL`、`MODEL_API_KEY` 和 `MODEL_NAME` 后即可接入 OpenAI-compatible 模型服务。高风险动作采用“计划 → 用户确认 → 执行”的两阶段流程，避免 Agent 直接修改外部状态。

## 启动

要求 Node.js 22+（本项目按 Node.js 24 验证）。

```bash
npm test
npm start
```

打开 <http://localhost:8787>，或直接调用：

```bash
curl -X POST http://localhost:8787/api/chat \
  -H "content-type: application/json" \
  -d '{"conversationId":"demo","message":"ORD-1002 的订单状态是什么？"}'
```

## 模型与数据层

项目保留了清晰的 Agent / Tool 边界和 OpenAI-compatible 模型适配器。知识库可以替换为 PostgreSQL + pgvector，订单和工单工具可以替换为真实的业务 API，前端可以升级为 React/Next.js 并接入 SSE 流式输出。


