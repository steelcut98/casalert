import { NextResponse } from "next/server";
import {
  fetchPhiladelphiaViolationsForProperty,
  type PhiladelphiaViolationNormalized,
} from "@/lib/philadelphia-violations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json(
      { error: "Missing required query parameter: address" },
      { status: 400 }
    );
  }

  try {
    const rows: PhiladelphiaViolationNormalized[] =
      await fetchPhiladelphiaViolationsForProperty(address);

    return NextResponse.json({
      dataset: "philadelphia",
      address,
      total: rows.length,
      data: rows as unknown[],
    });
  } catch (err) {
    console.error("[philadelphia-violations] Fetch error", err);
    return NextResponse.json(
      {
        error: "Failed to fetch Philadelphia violations",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
