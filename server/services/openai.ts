import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface ChatCompletionOptions {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  maxTokens?: number;
}

export async function createChatCompletion(options: ChatCompletionOptions): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: options.messages,
      max_tokens: options.maxTokens || 1000,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI Chat Completion Error:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI Embedding Error:", error);
    throw new Error(`Failed to create embedding: ${error.message}`);
  }
}

export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
