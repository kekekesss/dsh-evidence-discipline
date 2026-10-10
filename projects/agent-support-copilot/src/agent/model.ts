type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface ModelAdapter {
  complete(messages: ChatMessage[], fallback: string): Promise<string>;
}

export class HeuristicModel implements ModelAdapter {
  async complete(_messages: ChatMessage[], fallback: string): Promise<string> { return fallback; }
}

export class OpenAICompatibleModel implements ModelAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(messages: ChatMessage[], fallback: string): Promise<string> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({ model: this.model, temperature: 0.2, messages }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`model status ${response.status}`);
        const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const answer = payload.choices?.[0]?.message?.content?.trim();
        if (answer) return answer;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
    return fallback;
  }
}

export function createModelFromEnv(): ModelAdapter {
  const baseUrl = process.env.MODEL_BASE_URL;
  const apiKey = process.env.MODEL_API_KEY;
  const model = process.env.MODEL_NAME;
  return baseUrl && apiKey && model ? new OpenAICompatibleModel(baseUrl, apiKey, model) : new HeuristicModel();
}

