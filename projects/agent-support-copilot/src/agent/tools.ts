import type { ToolContext, ToolResult } from "../domain/types.ts";

type Tool = {
  name: string;
  description: string;
  run: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
};

const knowledge = [
  {
    id: "refund-policy",
    title: "退款规则",
    text: "未开始的订单可以申请全额退款；已经开始的订单由客服根据有效服务时长和证据处理。",
  },
  {
    id: "safety-policy",
    title: "安全规则",
    text: "平台禁止私下交易、诱导转账和索要敏感信息。发现异常时应保留订单号并提交工单。",
  },
  {
    id: "order-flow",
    title: "订单流程",
    text: "订单状态依次为待接单、进行中、待确认和已完成。支付回调成功后才会进入可服务状态。",
  },
];

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor() {
    this.register({
      name: "search_knowledge_base",
      description: "Search support policies and product documentation.",
      run: async (input) => {
        const query = String(input.query ?? "").toLowerCase();
        const hits = knowledge.filter((item) => `${item.title}${item.text}`.toLowerCase().includes(query) || query.split(/\s+/).some((term) => `${item.title}${item.text}`.toLowerCase().includes(term)));
        return { ok: true, data: hits.length ? hits : knowledge.slice(0, 1), source: "support-kb" };
      },
    });

    this.register({
      name: "get_order_status",
      description: "Read a sanitized order status by order id.",
      run: async (input) => {
        const orderId = String(input.orderId ?? "").trim();
        if (!/^ORD-\d{4}$/.test(orderId)) return { ok: false, data: null, error: "订单号格式应为 ORD-1234" };
        const statuses: Record<string, string> = { "ORD-1001": "进行中", "ORD-1002": "待确认", "ORD-1003": "已完成" };
        return { ok: true, data: { orderId, status: statuses[orderId] ?? "待接单", updatedAt: new Date().toISOString() }, source: "order-service" };
      },
    });

    this.register({
      name: "create_support_ticket",
      description: "Create a human support ticket after explicit confirmation.",
      run: async (input, context) => ({
        ok: true,
        data: { ticketId: `T-${Date.now().toString().slice(-6)}`, status: "待人工处理", conversationId: context.conversationId, summary: String(input.summary ?? "") },
        source: "ticket-service",
      }),
    });
  }

  register(tool: Tool): void { this.tools.set(tool.name, tool); }

  async call(name: string, input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) return { ok: false, data: null, error: `未知工具: ${name}` };
    return tool.run(input, context);
  }
}

