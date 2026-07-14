export interface OpenRouterError {
  error: string;
  details?: unknown;
}

export const API_KEY = process.env.OPENROUTER_API_KEY;
export const BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
export const TIMEOUT_MS = 600000;

export async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number }) {
  const { timeout = TIMEOUT_MS } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}

export function extractJSON(text: string): string {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1];
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function repairJSON(jsonStr: string): any {
  return jsonStr.replace(/,\s*([\]}])/g, "$1");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function makeOpenRouterRequest(model: string, messages: any[], maxTokens = 3000, temperature = 0.7) {
  if (!API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }
  const response = await fetchWithTimeout(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Interior AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
