import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SupportAgent } from "../agent/agent.ts";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "frontend");
const agent = new SupportAgent();

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  response.end(JSON.stringify(body));
}

async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function conversationId(pathname: string): string | undefined {
  return pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/)?.[1];
}

export function createApp() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "OPTIONS") { response.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" }); return response.end(); }
      if (request.method === "GET" && url.pathname === "/api/health") return json(response, 200, { ok: true, service: "agent-support-copilot", time: new Date().toISOString() });
      if (request.method === "POST" && url.pathname === "/api/chat") {
        const input = await body(request);
        const id = String(input.conversationId || randomUUID());
        const reply = await agent.handle(id, String(input.message ?? ""), typeof input.userId === "string" ? input.userId : undefined);
        return json(response, 200, reply);
      }
      if (request.method === "POST" && url.pathname === "/api/confirm") {
        const input = await body(request);
        const reply = await agent.confirm(String(input.conversationId), (input.payload ?? {}) as Record<string, unknown>, typeof input.userId === "string" ? input.userId : undefined);
        return json(response, 200, reply);
      }
      if (request.method === "GET") {
        const target = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
        const file = await readFile(join(root, target));
        const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
        response.writeHead(200, { "content-type": types[extname(target)] ?? "text/plain; charset=utf-8" });
        return response.end(file);
      }
      return json(response, 404, { error: "Not found" });
    } catch (error) {
      return json(response, 400, { error: error instanceof Error ? error.message : "Bad request" });
    }
  });
}

