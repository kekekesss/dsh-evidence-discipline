import { randomUUID } from "node:crypto";
import type { AgentReply, AgentStep, ToolContext } from "../domain/types.ts";
import { ConversationMemory } from "./memory.ts";
import { createModelFromEnv, type ModelAdapter } from "./model.ts";
import { ToolRegistry } from "./tools.ts";

const now = () => new Date().toISOString();

export class SupportAgent {
  private readonly tools: ToolRegistry;
  private readonly memory: ConversationMemory;
  private readonly model: ModelAdapter;

  constructor(tools = new ToolRegistry(), memory = new ConversationMemory(), model = createModelFromEnv()) {
    this.tools = tools;
    this.memory = memory;
    this.model = model;
  }

  async handle(conversationId: string, userMessage: string, userId?: string): Promise<AgentReply> {
    const traceId = randomUUID();
    const steps: AgentStep[] = [{ type: "plan", name: "route_request", detail: "Classify intent and select the minimum required tools", at: now() }];
    this.memory.append(conversationId, { role: "user", content: userMessage, createdAt: now() });
    const context: ToolContext = { conversationId, userId };
    const lower = userMessage.toLowerCase();
    const citations: string[] = [];

    const orderId = userMessage.match(/ORD-\d{4}/i)?.[0]?.toUpperCase();
    if (orderId || /订单(状态|进度)|进度|状态/.test(userMessage)) {
      const result = await this.callTool("get_order_status", { orderId: orderId ?? "" }, context, steps);
      if (result.ok) {
        const data = result.data as { orderId: string; status: string };
        const fallback = `订单 ${data.orderId} 当前状态是「${data.status}」。如果状态长时间不变化，我可以继续帮你创建人工工单。`;
        const answer = await this.model.complete([{ role: "system", content: "你是严谨的订单支持助手，只基于给定数据回答。" }, { role: "user", content: JSON.stringify(data) }], fallback);
        return this.finish(conversationId, traceId, answer, steps, citations);
      }
      return this.finish(conversationId, traceId, String(result.error), steps, citations);
    }

    if (/退款|安全|私下|交易|流程|规则|政策|怎么处理/.test(userMessage)) {
      const result = await this.callTool("search_knowledge_base", { query: userMessage }, context, steps);
      if (result.ok) {
        const hits = result.data as Array<{ id: string; title: string; text: string }>;
        citations.push(...hits.map((hit) => hit.id));
        const fallback = hits.map((hit) => `**${hit.title}**：${hit.text}`).join("\n\n");
        const answer = await this.model.complete([{ role: "system", content: "你是客服知识库助手，只引用给定资料，不要编造政策。" }, { role: "user", content: JSON.stringify(hits) }], fallback);
        return this.finish(conversationId, traceId, answer, steps, citations);
      }
    }

    if (/人工|客服|投诉|申诉|异常|解决不了/.test(lower)) {
      steps.push({ type: "plan", name: "require_confirmation", detail: "Ticket creation changes external state; ask for confirmation", at: now() });
      return this.finish(conversationId, traceId, "我可以帮你创建人工工单。为了避免误提交，请回复「确认创建工单」，并附上订单号或问题摘要。", steps, citations, { action: "create_support_ticket", payload: { summary: userMessage } });
    }

    const related = this.memory.relevant(conversationId, userMessage);
    const contextHint = related.length > 1 ? "我记得你前面提到过这个问题。" : "";
    return this.finish(conversationId, traceId, `${contextHint}我可以查询订单、解释退款和安全规则，或在你确认后创建人工工单。`, steps, citations);
  }

  async confirm(conversationId: string, payload: Record<string, unknown>, userId?: string): Promise<AgentReply> {
    const steps: AgentStep[] = [{ type: "plan", name: "confirmed_action", detail: "User explicitly confirmed ticket creation", at: now() }];
    const result = await this.callTool("create_support_ticket", payload, { conversationId, userId }, steps);
    const data = result.data as { ticketId: string; status: string };
    return this.finish(conversationId, randomUUID(), `工单已创建：${data.ticketId}，当前状态「${data.status}」。`, steps, [], undefined);
  }

  private async callTool(name: string, input: Record<string, unknown>, context: ToolContext, steps: AgentStep[]) {
    steps.push({ type: "tool_call", name, detail: JSON.stringify(input), at: now() });
    const result = await this.tools.call(name, input, context);
    steps.push({ type: "tool_result", name, detail: result.ok ? "success" : result.error ?? "failed", at: now() });
    return result;
  }

  private finish(conversationId: string, traceId: string, answer: string, steps: AgentStep[], citations: string[], pendingConfirmation?: AgentReply["pendingConfirmation"]): AgentReply {
    steps.push({ type: "response", name: "compose_answer", detail: "Return answer with trace metadata and citations", at: now() });
    this.memory.append(conversationId, { role: "assistant", content: answer, createdAt: now() });
    return { answer, conversationId, traceId, steps, citations, pendingConfirmation };
  }
}

