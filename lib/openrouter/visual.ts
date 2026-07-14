import { VisualContext } from "@/types";
import { makeOpenRouterRequest, extractJSON, repairJSON } from "./utils";

const VISUAL_MODEL = process.env.OPENROUTER_VISUAL_MODEL || "google/gemma-4-31b-it:free";

const VISION_SYSTEM_PROMPT = `You are an expert Interior Design Image Analyst.
Your sole responsibility is to analyze the provided design context and extract structured visual information.
Do not generate final recommendations, just analyze and extract.
Always answer in valid JSON matching this schema:
{
  "style": "string",
  "room": "string",
  "colour_palette": ["string"],
  "materials": ["string"],
  "lighting": "string",
  "mood": "string",
  "furniture": ["string"],
  "textures": ["string"],
  "architectural_features": ["string"]
}
Do not include markdown blocks or any text outside the JSON.`;

export async function analyzeVisualContext(imageUrl: string, userPrompt: string, retries = 2): Promise<{ data?: VisualContext; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const contentStr = [
        { type: "text", text: `User requested design intent: ${userPrompt}\nAnalyze the attached image and extract the requested JSON structure.` },
        { type: "image_url", image_url: { url: imageUrl } }
      ];

      const rawResponse = await makeOpenRouterRequest(VISUAL_MODEL, [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        { role: "user", content: contentStr }
      ], 1500, 0.4);

      const jsonContent = extractJSON(rawResponse);
      try {
        const parsed = JSON.parse(jsonContent) as VisualContext;
        return { data: parsed };
      } catch {
        const repaired = repairJSON(jsonContent);
        const parsedRepaired = JSON.parse(repaired) as VisualContext;
        return { data: parsedRepaired };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Visual analysis attempt ${attempt} failed:`, message);
      if (attempt === retries) return { error: message };
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return { error: "Failed to analyze visual context." };
}
