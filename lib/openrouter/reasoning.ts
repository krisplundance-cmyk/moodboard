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

export async function generateDesignReasoning(userPrompt: string, visualContext?: VisualContext, retries = 2): Promise<{ data?: InteriorDesignResponse; error?: string }> {
  let promptContent = `User Prompt: ${userPrompt}`;
  if (visualContext) {
    promptContent += `\n\nVisual Analysis Context (from image reference):\n${JSON.stringify(visualContext, null, 2)}\n\nPlease combine the user prompt and visual context to generate the final design recommendations.`;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const rawResponse = await makeOpenRouterRequest(REASONING_MODEL, [
        { role: "system", content: REASONING_SYSTEM_PROMPT },
        { role: "user", content: promptContent }
      ], 3000, 0.7);

      const jsonContent = extractJSON(rawResponse);
      try {
        const parsed = JSON.parse(jsonContent) as InteriorDesignResponse;
        return { data: parsed };
      } catch (parseError) {
        const repaired = repairJSON(jsonContent);
        const parsedRepaired = JSON.parse(repaired) as InteriorDesignResponse;
        return { data: parsedRepaired };
      }
    } catch (err: any) {
      console.error(`Reasoning attempt ${attempt} failed:`, err.message);
      if (attempt === retries) return { error: err.message };
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return { error: "Failed to generate design recommendations." };
}
