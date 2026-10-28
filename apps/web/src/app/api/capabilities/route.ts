import { NextResponse } from "next/server";
export async function GET() {
  try {
    const response = await fetch(
      `${process.env.AGENT_API_URL || "http://127.0.0.1:8000"}/capabilities`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok)
      return NextResponse.json(
        { error: "Cannot inspect backend capabilities" },
        { status: response.status }
      );
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      {
        error:
          "Start the local UniVA backend to inspect provider configuration",
      },
      { status: 503 }
    );
  }
}
