import { createAdminClient } from "@/lib/supabase/admin";

export type AnalyticsEventType =
  | "page_view"
  | "button_click"
  | "alert_email_opened"
  | "alert_link_clicked"
  | "search_performed"
  | "filter_applied"
  | "export_requested"
  | "property_info_viewed"
  | "settings_changed"
  | "plan_upgraded"
  | "plan_downgraded"
  | "checkout_started"
  | "onboarding_started"
  | "onboarding_completed"
  | "questionnaire_submitted"
  | "violation_expanded"
  | "violation_link_clicked"
  | "property_details_edited";

export async function logAnalyticsEvent(params: {
  userId: string;
  eventType: AnalyticsEventType;
  propertyId?: string | null;
  pagePath?: string | null;
  eventData?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("analytics_events").insert({
      user_id: params.userId,
      event_type: params.eventType,
      property_id: params.propertyId ?? null,
      page_path: params.pagePath ?? null,
      event_data: params.eventData ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AnalyticsEvent] Failed to log:", params.eventType, error);
  }
}
