import assert from "node:assert/strict";
import test from "node:test";
import { SupportAgent } from "../src/agent/agent.ts";

test("routes order questions to the order tool", async () => {
  const reply = await new SupportAgent().handle("c-1", "ORD-1002 的订单状态是什么？");
  assert.match(reply.answer, /待确认/);
  assert.ok(reply.steps.some((step) => step.name === "get_order_status"));
});

test("returns citations for policy retrieval", async () => {
  const reply = await new SupportAgent().handle("c-2", "未开始的订单可以退款吗？");
  assert.match(reply.answer, /退款规则/);
  assert.deepEqual(reply.citations, ["refund-policy"]);
});

test("requires explicit confirmation before creating a ticket", async () => {
  const agent = new SupportAgent();
  const pending = await agent.handle("c-3", "我遇到异常，想找人工客服。");
  assert.equal(pending.pendingConfirmation?.action, "create_support_ticket");
  const confirmed = await agent.confirm("c-3", pending.pendingConfirmation!.payload);
  assert.match(confirmed.answer, /工单已创建/);
});

