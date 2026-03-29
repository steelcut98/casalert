import { getViolationSeverity } from "@/lib/compliance-score";

export type RiskBriefing = {
  summaryText: string;
  riskLevel: "low" | "moderate" | "high" | "critical";
  riskColor: string;
  severityBreakdown: { severity: string; count: number; color: string }[];
  keyRisks: string[];
  timeAnalysis: string;
  actionItems: string[];
};

export function generateRiskBriefing(violations: Array<{
  violation_description?: string | null;
  violation_code?: string | null;
  violation_status?: string | null;
  violation_date?: string | null;
  inspection_category?: string | null;
}>): RiskBriefing {
  const openViolations = violations.filter(
    (v) => (v.violation_status ?? "").toUpperCase() === "OPEN"
  );
  const total = violations.length;
  const openCount = openViolations.length;
  const closedCount = total - openCount;

  const severityCounts: Record<string, number> = {
    critical: 0, high: 0, moderate: 0, low: 0, administrative: 0,
  };
  for (const v of openViolations) {
    const sev = getViolationSeverity(v.violation_description, v.violation_code);
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
  }

  const severityBreakdown = [
    { severity: "Critical", count: severityCounts.critical, color: "text-red-500 dark:text-red-400" },
    { severity: "High", count: severityCounts.high, color: "text-orange-500 dark:text-orange-400" },
    { severity: "Moderate", count: severityCounts.moderate, color: "text-amber-500 dark:text-amber-400" },
    { severity: "Low", count: severityCounts.low, color: "text-zinc-500 dark:text-zinc-400" },
    { severity: "Administrative", count: severityCounts.administrative, color: "text-zinc-400 dark:text-zinc-500" },
  ].filter((s) => s.count > 0);

  let riskLevel: RiskBriefing["riskLevel"] = "low";
  let riskColor = "text-emerald-500";
  if (severityCounts.critical > 0 || openCount > 20) {
    riskLevel = "critical";
    riskColor = "text-red-500";
  } else if (severityCounts.high > 2 || openCount > 10) {
    riskLevel = "high";
    riskColor = "text-orange-500";
  } else if (openCount > 3) {
    riskLevel = "moderate";
    riskColor = "text-amber-500";
  }

  const keyRisks: string[] = [];
  const descUpper = openViolations.map((v) => (v.violation_description ?? "").toUpperCase());
  if (descUpper.some((d) => d.includes("SMOKE DETECTOR") || d.includes("CARB MONOX") || d.includes("FIRE"))) {
    keyRisks.push("Fire safety violations detected — these carry the highest fines and liability risk");
  }
  if (descUpper.some((d) => d.includes("STRUCTURAL") || d.includes("LINTEL") || d.includes("PORCH") || d.includes("STAIR"))) {
    keyRisks.push("Structural repair issues found — may require licensed contractor and permits");
  }
  if (descUpper.some((d) => d.includes("ELECTRICAL") || d.includes("WIRE") || d.includes("GFCI") || d.includes("CIRCUIT") || d.includes("CONFORM TO PRC"))) {
    keyRisks.push("Electrical code violations — require licensed electrician to resolve");
  }
  if (descUpper.some((d) => d.includes("MICE") || d.includes("RODENT") || d.includes("ROACH") || d.includes("PEST"))) {
    keyRisks.push("Pest infestation reported — may require professional extermination");
  }
  if (descUpper.some((d) => d.includes("OVERCROWD"))) {
    keyRisks.push("Overcrowding violation — serious safety and legal concern");
  }
  if (descUpper.some((d) => d.includes("HEAT UNIT") || d.includes("HEATING"))) {
    keyRisks.push("Heating adequacy violation — critical during cold months, high fine potential");
  }
  if (descUpper.some((d) => d.includes("EXIT") || d.includes("EGRESS") || d.includes("OBSTRUCTION"))) {
    keyRisks.push("Egress/exit violations — life safety issue requiring immediate attention");
  }

  const dates = violations
    .map((v) => v.violation_date ? new Date(v.violation_date).getTime() : null)
    .filter((d): d is number => d !== null && !isNaN(d))
    .sort((a, b) => a - b);

  let timeAnalysis = "";
  if (dates.length === 0) {
    timeAnalysis = "No violation dates available.";
  } else if (dates.length === 1) {
    timeAnalysis = `Single violation filed on ${new Date(dates[0]).toLocaleDateString()}.`;
  } else {
    const earliest = new Date(dates[0]);
    const latest = new Date(dates[dates.length - 1]);
    const spanDays = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);

    if (spanDays <= 7) {
      timeAnalysis = `All violations were filed within a single week (${earliest.toLocaleDateString()}) — likely from one inspection event.`;
    } else if (spanDays <= 30) {
      timeAnalysis = `Violations span about ${Math.round(spanDays)} days (${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()}) — likely from a single inspection period.`;
    } else if (spanDays <= 365) {
      timeAnalysis = `Violations span ${Math.round(spanDays / 30)} months (${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()}).`;
    } else {
      const years = Math.round(spanDays / 365 * 10) / 10;
      timeAnalysis = `Violation history spans ${years} years (${earliest.toLocaleDateString()} to ${latest.toLocaleDateString()}).`;
    }
  }

  const actionItems: string[] = [];
  if (severityCounts.critical > 0) {
    actionItems.push(`Address ${severityCounts.critical} critical violation${severityCounts.critical !== 1 ? "s" : ""} immediately — these carry the highest fines`);
  }
  if (severityCounts.high > 0) {
    actionItems.push(`Schedule repairs for ${severityCounts.high} high-severity issue${severityCounts.high !== 1 ? "s" : ""}`);
  }
  if (openCount > 0) {
    actionItems.push("Set deadline reminders on open violations to track compliance dates");
  }
  if (openCount === 0 && total > 0) {
    actionItems.push("All violations are resolved — continue monitoring for new filings");
  }
  if (total === 0) {
    actionItems.push("No violations on file — CasAlerts will monitor for any new filings");
  }

  let summaryText = "";
  if (total === 0) {
    summaryText = "No violations found on public record. CasAlerts will continuously monitor this address and alert you if any violations are filed.";
  } else if (openCount === 0) {
    summaryText = `This property has ${total} violation${total !== 1 ? "s" : ""} on record, all currently resolved. CasAlerts will monitor for any new filings.`;
  } else {
    const severityParts: string[] = [];
    if (severityCounts.critical > 0) severityParts.push(`${severityCounts.critical} critical`);
    if (severityCounts.high > 0) severityParts.push(`${severityCounts.high} high-severity`);
    if (severityCounts.moderate > 0) severityParts.push(`${severityCounts.moderate} moderate`);
    if (severityCounts.low > 0) severityParts.push(`${severityCounts.low} low-severity`);
    if (severityCounts.administrative > 0) severityParts.push(`${severityCounts.administrative} administrative`);

    summaryText = `This property has ${openCount} open violation${openCount !== 1 ? "s" : ""}: ${severityParts.join(", ")}. ${closedCount > 0 ? `${closedCount} previous violation${closedCount !== 1 ? "s have" : " has"} been resolved. ` : ""}${timeAnalysis}`;
  }

  return {
    summaryText,
    riskLevel,
    riskColor,
    severityBreakdown,
    keyRisks,
    timeAnalysis,
    actionItems,
  };
}
