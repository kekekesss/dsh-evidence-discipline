import type { Message } from "../domain/types.ts";

export class ConversationMemory {
  private readonly conversations = new Map<string, Message[]>();

  history(conversationId: string): Message[] {
    return [...(this.conversations.get(conversationId) ?? [])];
  }

  append(conversationId: string, message: Message): void {
    const messages = this.conversations.get(conversationId) ?? [];
    messages.push(message);
    this.conversations.set(conversationId, messages.slice(-20));
  }

  relevant(conversationId: string, query: string): Message[] {
    const terms = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
    return this.history(conversationId).filter((message) => {
      const words = message.content.toLowerCase();
      return [...terms].some((term) => words.includes(term));
    }).slice(-5);
  }
}

