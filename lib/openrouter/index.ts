import { analyzeVisualContext } from "./visual";
import { generateDesignReasoning } from "./reasoning";
import { InteriorDesignResponse } from "@/types";

export interface GenerateDesignParams {
  prompt: string;
  imageUrl?: string;
}

export async function generateInteriorDesign({ prompt, imageUrl }: GenerateDesignParams): Promise<{ data?: InteriorDesignResponse; error?: { error: string; details?: string } }> {
  try {
    let visualContext;

    // Step 1: Visual Analysis (if image provided)
    if (imageUrl) {
      console.log("Analyzing visual context with Google Gemma...");
      const { data: vContext, error: vError } = await analyzeVisualContext(imageUrl, prompt);
      if (vError) {
        return { error: { error: "Failed to analyze image context.", details: vError } };
      }
      visualContext = vContext;
    }

    // Step 2: Reasoning and Generation
    console.log("Generating design recommendations with NVIDIA Nemotron...");
    const { data: rData, error: rError } = await generateDesignReasoning(prompt, visualContext);
    
    if (rError) {
      return { error: { error: "Failed to generate design recommendations.", details: rError } };
    }

    return { data: rData };
  } catch (error: unknown) {
    return { error: { error: "Unexpected error during AI generation orchestration.", details: (error as Error).message } };
  }
}
