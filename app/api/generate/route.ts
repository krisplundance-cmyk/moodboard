import { NextResponse } from "next/server";
import { generateInteriorDesign } from "@/lib/openrouter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, imageUrl } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A valid prompt is required." },
        { status: 400 }
      );
    }

    const { data, error } = await generateInteriorDesign({ prompt, imageUrl });

    if (error) {
      return NextResponse.json({ error: error.error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("API Generate Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
