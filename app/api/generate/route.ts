import { NextResponse } from "next/server";
import { generateInteriorDesign } from "@/lib/openrouter";

// Vercel Fluid Compute: Hobby supports up to 300s, Pro/Enterprise up to 800s.
// Primary model (Nemotron 3.5 Lightning) is fast; fallback (MiniMax M3) adds
// extra time if triggered. 300s gives comfortable headroom for both paths.
export const maxDuration = 300;

export async function POST(request: Request) {
  const requestStart = Date.now();
  console.log("[generate] Request received");

  try {
    const body = await request.json();
    const { prompt, imageUrl } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A valid prompt is required." },
        { status: 400 }
      );
    }

    console.log("[generate] Starting AI generation pipeline");
    const { data, error } = await generateInteriorDesign({ prompt, imageUrl });
    const totalMs = Date.now() - requestStart;

    if (error) {
      console.error(`[generate] Pipeline failed after ${totalMs}ms:`, error.error, error.details ?? "");
      return NextResponse.json({ error: error.error }, { status: 500 });
    }

    console.log(`[generate] Pipeline completed successfully in ${totalMs}ms`);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const totalMs = Date.now() - requestStart;
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[generate] Unhandled error after ${totalMs}ms:`, message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
