import { createAdminClient } from "@/lib/supabase/admin";

export type ComplianceEventType =
  | "violation_detected"
  | "violation_status_changed"
  | "violation_viewed"
  | "violation_resolved_by_user"
  | "violation_resolution_verified"
  | "violation_resolution_bounced"
  | "alert_sent_email"
  | "alert_sent_sms"
  | "reminder_set"
  | "reminder_triggered"
  | "reminder_dismissed"
  | "property_added"
  | "property_removed"
  | "property_details_updated"
  | "property_rescanned"
  | "property_enriched"
  | "baseline_scan_completed"
  | "deadline_missed"
  | "ownership_started"
  | "resolution_form_submitted"
  | "contractor_recorded";

export type ComplianceEventData = {
  description?: string;
  violation_code?: string;
  violation_description?: string;
  old_status?: string;
  new_status?: string;
  violation_date?: string;
  inspection_category?: string;
  alert_channel?: "email" | "sms";
  recipient?: string;
  reminder_date?: string;
  resolution_method?: string;
  resolution_cost_range?: string;
  contractor_name?: string;
  contractor_trade?: string;
  fix_date?: string;
  enrichment_source?: string;
  fields_updated?: string[];
  violations_found?: number;
  new_violations?: number;
  status_changes?: number;
  [key: string]: unknown;
};

export async function logComplianceEvent(params: {
  propertyId: string;
  userId: string;
  eventType: ComplianceEventType;
  violationId?: string | null;
  eventData?: ComplianceEventData;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("compliance_events").insert({
      property_id: params.propertyId,
      user_id: params.userId,
      event_type: params.eventType,
      violation_id: params.violationId ?? null,
      event_data: params.eventData ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ComplianceEvent] Failed to log event:", params.eventType, error);
  }
}

export async function logComplianceEventBatch(events: Array<{
  propertyId: string;
  userId: string;
  eventType: ComplianceEventType;
  violationId?: string | null;
  eventData?: ComplianceEventData;
}>): Promise<void> {
  if (events.length === 0) return;
  try {
    const admin = createAdminClient();
    const rows = events.map((e) => ({
      property_id: e.propertyId,
      user_id: e.userId,
      event_type: e.eventType,
      violation_id: e.violationId ?? null,
      event_data: e.eventData ?? null,
      created_at: new Date().toISOString(),
    }));
    await admin.from("compliance_events").insert(rows);
  } catch (error) {
    console.error("[ComplianceEvent] Failed to log batch:", error);
  }
}
