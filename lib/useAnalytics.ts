"use client";

import { useEffect, useCallback, useRef } from "react";

type AnalyticsEventType =
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
  | "resolution_form_started"
  | "resolution_form_completed"
  | "resolution_form_abandoned"
  | "rescan_triggered"
  | "reminder_set_clicked"
  | "mark_resolved_clicked"
  | "property_info_opened"
  | "undo_resolution_clicked";

function sendAnalyticsEvent(
  eventType: AnalyticsEventType,
  propertyId?: string | null,
  eventData?: Record<string, unknown>
) {
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType,
      propertyId: propertyId ?? null,
      pagePath: typeof window !== "undefined" ? window.location.pathname : null,
      eventData: eventData ?? null,
    }),
  }).catch(() => {});
}

export function useAnalytics(propertyId?: string | null) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    sendAnalyticsEvent("page_view", propertyId, {
      path: window.location.pathname,
      referrer: document.referrer || null,
    });
  }, [propertyId]);

  const trackEvent = useCallback(
    (eventType: AnalyticsEventType, eventData?: Record<string, unknown>) => {
      sendAnalyticsEvent(eventType, propertyId, eventData);
    },
    [propertyId]
  );

  return { trackEvent };
}

export { sendAnalyticsEvent };
export type { AnalyticsEventType };
