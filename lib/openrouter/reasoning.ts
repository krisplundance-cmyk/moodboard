import { InteriorDesignResponse, VisualContext } from "@/types";
import { makeOpenRouterRequest, extractJSON, repairJSON } from "./utils";

// ---------------------------------------------------------------------------
// Model configuration
// Change these constants to swap models without touching any other logic.
// ---------------------------------------------------------------------------
const PRIMARY_MODEL =
  process.env.OPENROUTER_REASONING_MODEL || "nvidia/nemotron-3.5-lightning:free";
const FALLBACK_MODEL =
  process.env.OPENROUTER_REASONING_FALLBACK_MODEL || "minimax/minimax-m3:free";

const REASONING_SYSTEM_PROMPT = `You are a Senior Interior Designer with over 20 years of professional experience.
Your job is to interpret the user's design requirements (and any structured visual context provided), perform advanced interior design reasoning, and generate professional design recommendations.
Never change the requested design style. Never recommend unrelated styles.
Always answer in valid JSON.
The JSON must exactly match this schema:
{
  "project_summary": "Professional overview",
  "design_concept": "Detailed explanation",
  "colour_palette": [{"name": "string", "hex": "string", "usage": "string"}],
  "mood_board": {
    "style": "string",
    "mood": "string",
    "keywords": ["string"],
    "recommended_materials": ["string"],
    "recommended_textures": ["string"],
    "recommended_finishes": ["string"]
  },
  "materials": ["string"],
  "lighting": ["string"],
  "furniture": ["string"],
  "decor": ["string"],
  "space_planning": ["string"],
  "designer_notes": "string"
}
Do not include markdown or explanations outside the JSON.`;

// ---------------------------------------------------------------------------
// JSON parsing helper — shared by both model attempts
// ---------------------------------------------------------------------------
function parseDesignResponse(rawResponse: string): InteriorDesignResponse {
  const jsonContent = extractJSON(rawResponse);

  try {
    return JSON.parse(jsonContent) as InteriorDesignResponse;
  } catch (parseErr) {
    // First parse failed — attempt structural repair for common truncation
    // issues: trailing commas, unclosed arrays/objects from token limits.
    console.warn(
      `[reasoning] Initial JSON parse failed, attempting repair: ${(parseErr as Error).message}`
    );
    const repaired = repairJSON(jsonContent);
    return JSON.parse(repaired) as InteriorDesignResponse;
  }
}

// ---------------------------------------------------------------------------
// Single model attempt — returns the parsed response or throws on any failure.
// makeOpenRouterRequest already throws for:
//   - non-2xx HTTP status (provider overload, rate-limit, upstream error)
//   - empty / null content in the response body
// So any exception here means "this model failed; try the next one."
// ---------------------------------------------------------------------------
async function attemptModel(
  model: string,
  messages: { role: string; content: unknown }[]
): Promise<InteriorDesignResponse> {
  const rawResponse = await makeOpenRouterRequest(model, messages, 3000, 0.7);

  console.log(
    `[reasoning] JSON parsing started (response length: ${rawResponse.length} chars)`
  );

  const result = parseDesignResponse(rawResponse);
  console.log("[reasoning] JSON parsing succeeded");
  return result;
}

// ---------------------------------------------------------------------------
// Main export
// Flow: PRIMARY_MODEL → on any failure → FALLBACK_MODEL → on failure → error
// There is intentionally no retry of the same model. If the primary fails
// (overloaded, rate-limited, empty response, bad JSON), the fallback is tried
// immediately without any sleep. This keeps total execution well within the
// 300 s maxDuration limit even when the primary fails quickly (~61 s as seen
// in recent Vercel logs).
// ---------------------------------------------------------------------------
export async function generateDesignReasoning(
  userPrompt: string,
  visualContext?: VisualContext
): Promise<{ data?: InteriorDesignResponse; error?: string }> {
  let promptContent = `User Prompt: ${userPrompt}`;
  if (visualContext) {
    promptContent += `\n\nVisual Analysis Context (from image reference):\n${JSON.stringify(
      visualContext,
      null,
      2
    )}\n\nPlease combine the user prompt and visual context to generate the final design recommendations.`;
  }

  const messages = [
    { role: "system", content: REASONING_SYSTEM_PROMPT },
    { role: "user", content: promptContent },
  ];

  // ── Primary model ────────────────────────────────────────────────────────
  const primaryStart = Date.now();
  console.log(`[reasoning] Primary model started: ${PRIMARY_MODEL}`);

  try {
    const data = await attemptModel(PRIMARY_MODEL, messages);
    const primaryMs = Date.now() - primaryStart;
    console.log(`[reasoning] Primary model succeeded in ${primaryMs}ms`);
    return { data };
  } catch (primaryErr) {
    const primaryMs = Date.now() - primaryStart;
    const reason = (primaryErr as Error).message;
    console.error(
      `[reasoning] Primary model failed after ${primaryMs}ms: ${reason}`
    );
  }

  // ── Fallback model ───────────────────────────────────────────────────────
  console.log(`[reasoning] Falling back to: ${FALLBACK_MODEL}`);
  const fallbackStart = Date.now();

  try {
    const data = await attemptModel(FALLBACK_MODEL, messages);
    const fallbackMs = Date.now() - fallbackStart;
    console.log(`[reasoning] Fallback model succeeded in ${fallbackMs}ms`);
    return { data };
  } catch (fallbackErr) {
    const fallbackMs = Date.now() - fallbackStart;
    const reason = (fallbackErr as Error).message;
    console.error(
      `[reasoning] Fallback model failed after ${fallbackMs}ms: ${reason}`
    );
    console.error("[reasoning] Primary and fallback models both failed");
    return {
      error: `All models failed. Primary (${PRIMARY_MODEL}): see logs. Fallback (${FALLBACK_MODEL}): ${reason}`,
    };
  }
}
