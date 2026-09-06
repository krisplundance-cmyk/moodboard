import { InteriorDesignResponse, VisualContext } from "@/types";
import { makeOpenRouterRequest, extractJSON, repairJSON } from "./utils";

const REASONING_MODEL = process.env.OPENROUTER_REASONING_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

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

// retries=1 means exactly 1 attempt with no retry.
// Why: NVIDIA Nemotron on the free tier takes ~194s per attempt.
// Two attempts would use ~388s, which exceeds Vercel Fluid Compute's 300s
// maxDuration even on Pro. A single attempt leaves ~106s of headroom.
// If the model returns bad JSON we repair it; if content is empty we fail fast.
export async function generateDesignReasoning(userPrompt: string, visualContext?: VisualContext, retries = 1): Promise<{ data?: InteriorDesignResponse; error?: string }> {
  let promptContent = `User Prompt: ${userPrompt}`;
  if (visualContext) {
    promptContent += `\n\nVisual Analysis Context (from image reference):\n${JSON.stringify(visualContext, null, 2)}\n\nPlease combine the user prompt and visual context to generate the final design recommendations.`;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const attemptStart = Date.now();
    console.log(`[reasoning] NVIDIA request started (attempt ${attempt}/${retries}), model: ${REASONING_MODEL}`);

    try {
      const rawResponse = await makeOpenRouterRequest(REASONING_MODEL, [
        { role: "system", content: REASONING_SYSTEM_PROMPT },
        { role: "user", content: promptContent }
      ], 3000, 0.7);

      const elapsedMs = Date.now() - attemptStart;
      console.log(`[reasoning] NVIDIA response received in ${elapsedMs}ms (attempt ${attempt})`);

      // rawResponse is guaranteed non-empty here — makeOpenRouterRequest
      // now throws if content is empty, so we don't need to check again.
      console.log(`[reasoning] JSON parsing started (response length: ${rawResponse.length} chars)`);
      const jsonContent = extractJSON(rawResponse);

      try {
        const parsed = JSON.parse(jsonContent) as InteriorDesignResponse;
        console.log("[reasoning] JSON parsing succeeded");
        return { data: parsed };
      } catch (parseErr) {
        // First parse failed — attempt structural repair for common truncation
        // issues (trailing commas, unclosed arrays/objects from token limits).
        console.warn(`[reasoning] Initial JSON parse failed, attempting repair: ${(parseErr as Error).message}`);
        const repaired = repairJSON(jsonContent);
        const parsedRepaired = JSON.parse(repaired) as InteriorDesignResponse;
        console.log("[reasoning] JSON parsing succeeded after repair");
        return { data: parsedRepaired };
      }
    } catch (error: unknown) {
      const elapsedMs = Date.now() - attemptStart;
      const err = error as Error;
      console.error(`[reasoning] Attempt ${attempt} failed after ${elapsedMs}ms: ${err.message}`);

      if (attempt === retries) {
        return { error: err.message };
      }
      // Only sleep between retries (won't execute when retries=1).
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  return { error: "Failed to generate design recommendations." };
}
