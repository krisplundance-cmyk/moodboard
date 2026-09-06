import { InteriorDesignResponse, VisualContext } from "@/types";
import { makeOpenRouterRequest, extractJSON, repairJSON } from "./utils";

// ---------------------------------------------------------------------------
// Model configuration — swap models via env vars without touching any logic.
// ---------------------------------------------------------------------------
const PRIMARY_MODEL =
  process.env.OPENROUTER_REASONING_MODEL || "nvidia/nemotron-3.5-lightning:free";
const FALLBACK_MODEL =
  process.env.OPENROUTER_REASONING_FALLBACK_MODEL || "minimax/minimax-m3:free";

// Lower temperature → more deterministic, structurally reliable JSON output.
// 0.3 balances creativity with compliance to the strict JSON schema.
const GENERATION_TEMPERATURE = 0.3;

// ---------------------------------------------------------------------------
// System prompt
// The formatting rules are the primary defence against malformed JSON.
// They address the exact error class seen in logs:
//   "Expected ',' or '}' after property value" — caused by literal newline
//   or unescaped quote characters inside a JSON string value.
// ---------------------------------------------------------------------------
const REASONING_SYSTEM_PROMPT = `You are a Senior Interior Designer with over 20 years of professional experience.
Generate professional interior design recommendations for the user's project.
Never change the requested design style. Never recommend unrelated styles.

STRICT OUTPUT RULES — you MUST follow all of these exactly or your response will be rejected:
1. Return ONLY the raw JSON object. Nothing else at all.
2. Do NOT wrap the JSON in markdown code fences (\`\`\`json or \`\`\`).
3. Do NOT write any text, explanation, or introduction before or after the JSON.
4. Use double quotes for ALL JSON keys and ALL string values.
5. If a string value contains a double quote character, escape it as \\"
6. Do NOT include literal newline characters inside any string value. Use the two-character sequence \\n if you need to represent a line break within a string.
7. Do NOT include trailing commas after the last item in any object or array.
8. Do NOT truncate your response. Every field must be fully completed.
9. Every opening brace { must have a matching closing brace }.
10. Every opening bracket [ must have a matching closing bracket ].

Return exactly this JSON schema — no additional fields, no omitted fields:
{
  "project_summary": "string",
  "design_concept": "string",
  "colour_palette": [{"name": "string", "hex": "#RRGGBB", "usage": "string"}],
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
}`;

// ---------------------------------------------------------------------------
// JSON parsing — shared by both primary and fallback paths.
// Throws on unrecoverable parse failure so the outer catch triggers fallback.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateDesignResponse(data: any): InteriorDesignResponse {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Parsed JSON is not a valid object.");
  }
  
  const requiredFields = [
    "project_summary",
    "design_concept",
    "colour_palette",
    "mood_board",
    "materials",
    "lighting",
    "furniture",
    "decor",
    "space_planning",
    "designer_notes"
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // 1. Validate top-level array fields
  const topLevelArrays = [
    "colour_palette",
    "materials",
    "lighting",
    "furniture",
    "decor",
    "space_planning"
  ];
  for (const field of topLevelArrays) {
    if (!Array.isArray(data[field])) {
      throw new Error(`Field '${field}' must be an array`);
    }
  }

  // 2. Validate mood_board object and its array fields
  if (!data.mood_board || typeof data.mood_board !== "object" || Array.isArray(data.mood_board)) {
    throw new Error("Field 'mood_board' must be an object");
  }

  const moodBoardArrays = [
    "keywords",
    "recommended_materials",
    "recommended_textures",
    "recommended_finishes"
  ];
  for (const field of moodBoardArrays) {
    if (!Array.isArray(data.mood_board[field])) {
      throw new Error(`Field 'mood_board.${field}' must be an array`);
    }
  }
  
  return data as InteriorDesignResponse;
}

function parseDesignResponse(rawResponse: string): InteriorDesignResponse {
  const jsonContent = extractJSON(rawResponse);

  try {
    const parsed = JSON.parse(jsonContent);
    return validateDesignResponse(parsed);
  } catch {
    // Direct parse or validation failed — repairJSON fixes:
    //   • trailing commas
    //   • literal newlines / tabs / carriage returns inside string values
    //   • unclosed brackets/braces from truncated output
    const repaired = repairJSON(jsonContent);
    // If this also throws (e.g. still missing fields due to truncation),
    // the exception propagates to the outer catch (primary or fallback)
    // so the correct fallback logic is triggered.
    const parsedRepaired = JSON.parse(repaired);
    return validateDesignResponse(parsedRepaired);
  }
}

// ---------------------------------------------------------------------------
// Single model attempt with labelled logging.
// `label` is "Primary" or "Fallback" — appears in every log line so Vercel
// logs clearly show which path is executing.
// Throws on any failure: API error, empty content, or JSON parse failure.
// ---------------------------------------------------------------------------
async function attemptModel(
  model: string,
  label: string,
  messages: { role: string; content: unknown }[],
  startTime: number
): Promise<InteriorDesignResponse> {
  const rawResponse = await makeOpenRouterRequest(
    model,
    messages,
    3000,
    GENERATION_TEMPERATURE
  );

  const elapsedMs = Date.now() - startTime;
  console.log(`[reasoning] ${label} response received in ${elapsedMs}ms`);
  console.log(
    `[reasoning] ${label} JSON parsing started (response length: ${rawResponse.length} chars)`
  );

  try {
    const result = parseDesignResponse(rawResponse);
    console.log(`[reasoning] ${label} JSON parsing succeeded`);
    return result;
  } catch (parseErr) {
    // Log the exact parse error, then re-throw so the caller's catch block
    // handles it (primary → triggers fallback; fallback → returns error).
    console.error(
      `[reasoning] ${label} JSON parsing failed: ${(parseErr as Error).message}`
    );
    throw parseErr;
  }
}

// ---------------------------------------------------------------------------
// Main export
// Flow: PRIMARY_MODEL → on any failure → FALLBACK_MODEL → on failure → error
//
// "Any failure" includes: provider overload/503, rate limit, timeout, empty
// response (caught by makeOpenRouterRequest), AND JSON parse failure (caught
// by attemptModel). All of these propagate as thrown exceptions and are
// caught by the primary catch block, which immediately triggers the fallback
// with no sleep and no retry of the same model.
// ---------------------------------------------------------------------------
export async function generateDesignReasoning(
  userPrompt: string,
  visualContext?: VisualContext
): Promise<{ data?: InteriorDesignResponse; error?: string }> {
  let promptContent = `User Prompt: ${userPrompt}`;
  if (visualContext) {
    promptContent +=
      `\n\nVisual Analysis Context (from image reference):\n` +
      JSON.stringify(visualContext, null, 2) +
      `\n\nPlease combine the user prompt and visual context to generate the final design recommendations.`;
  }

  const messages = [
    { role: "system", content: REASONING_SYSTEM_PROMPT },
    { role: "user", content: promptContent },
  ];

  // ── Primary model ─────────────────────────────────────────────────────────
  const primaryStart = Date.now();
  console.log(`[reasoning] Primary model started: ${PRIMARY_MODEL}`);

  try {
    const data = await attemptModel(PRIMARY_MODEL, "Primary", messages, primaryStart);
    const primaryMs = Date.now() - primaryStart;
    console.log(`[reasoning] Primary model succeeded in ${primaryMs}ms`);
    return { data };
  } catch (primaryErr) {
    const primaryMs = Date.now() - primaryStart;
    // Note: JSON parse errors are already logged inside attemptModel.
    // Only log here for API-level errors that weren't logged there.
    console.error(
      `[reasoning] Primary model failed after ${primaryMs}ms: ${(primaryErr as Error).message}`
    );
  }

  // ── Fallback model ────────────────────────────────────────────────────────
  console.log(`[reasoning] Falling back to: ${FALLBACK_MODEL}`);
  const fallbackStart = Date.now();

  try {
    const data = await attemptModel(FALLBACK_MODEL, "Fallback", messages, fallbackStart);
    const fallbackMs = Date.now() - fallbackStart;
    console.log(`[reasoning] Fallback model succeeded in ${fallbackMs}ms`);
    return { data };
  } catch (fallbackErr) {
    const fallbackMs = Date.now() - fallbackStart;
    const reason = (fallbackErr as Error).message;
    console.error(
      `[reasoning] Fallback model failed after ${fallbackMs}ms: ${reason}`
    );
    console.error("[reasoning] Both models failed");
    return {
      error: `All models failed. Primary (${PRIMARY_MODEL}): see logs. Fallback (${FALLBACK_MODEL}): ${reason}`,
    };
  }
}
