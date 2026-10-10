export type Role = "user" | "assistant" | "tool";

export type Message = {
  role: Role;
  content: string;
  createdAt: string;
  toolName?: string;
};

export type ToolContext = {
  conversationId: string;
  userId?: string;
};

export type ToolResult = {
  ok: boolean;
  data: unknown;
  source?: string;
  error?: string;
};

export type AgentStep = {
  type: "plan" | "tool_call" | "tool_result" | "response";
  name: string;
  detail: string;
  at: string;
};

export type AgentReply = {
  answer: string;
  conversationId: string;
  traceId: string;
  steps: AgentStep[];
  citations: string[];
  pendingConfirmation?: {
    action: string;
    payload: Record<string, unknown>;
  };
};

