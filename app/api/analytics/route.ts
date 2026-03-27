import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAnalyticsEvent, type AnalyticsEventType } from "@/lib/analytics-events";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, propertyId, pagePath, eventData } = body as {
      eventType: AnalyticsEventType;
      propertyId?: string | null;
      pagePath?: string | null;
      eventData?: Record<string, unknown>;
    };

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    await logAnalyticsEvent({
      userId: user.id,
      eventType,
      propertyId: propertyId ?? null,
      pagePath: pagePath ?? null,
      eventData: eventData ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
