export interface OpenRouterError {
  error: string;
  details?: unknown;
}

export const API_KEY = process.env.OPENROUTER_API_KEY;
export const BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
// 10 minutes — intentionally generous. Vercel's maxDuration on the route
// is the real hard ceiling; this just prevents the fetch from hanging forever
// if Vercel's kill signal is somehow delayed.
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
      // Use the actual deployment URL so OpenRouter referral tracking is accurate.
      // Set NEXT_PUBLIC_SITE_URL in your Vercel project env vars to your domain.
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://openrouter.ai",
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

  // Guard against empty/null content — this is the root cause of
  // "Unexpected end of JSON input". The free-tier model can return an
  // empty choices array or null content when overloaded or rate-limited.
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string" || content.trim() === "") {
    // Include any error details OpenRouter may have returned
    const apiError = data.error?.message ?? data.error ?? "empty response";
    throw new Error(`OpenRouter returned no content from model "${model}": ${JSON.stringify(apiError)}`);
  }
  return content;
}
