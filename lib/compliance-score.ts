export type ComplianceScoreResult = {
  score: number;
  grade: string;
  gradeColor: string;
  factors: {
    label: string;
    impact: number;
    detail: string;
  }[];
};

type ViolationForScoring = {
  violation_description?: string | null;
  violation_code?: string | null;
  inspection_category?: string | null;
  violation_status?: string | null;
  violation_date?: string | null;
  user_resolution_status?: string | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getGrade(score: number): { grade: string; gradeColor: string } {
  if (score >= 90) return { grade: "A", gradeColor: "text-emerald-500" };
  if (score >= 80) return { grade: "B", gradeColor: "text-emerald-400" };
  if (score >= 70) return { grade: "C", gradeColor: "text-amber-400" };
  if (score >= 60) return { grade: "D", gradeColor: "text-orange-400" };
  return { grade: "F", gradeColor: "text-red-500" };
}

export function getViolationSeverity(description?: string | null, code?: string | null): string {
  const desc = (description ?? "").toUpperCase();
  const c = (code ?? "").toUpperCase();

  const criticalPatterns = [
    "SMOKE DETECTOR", "FIRE EXTNG", "FIRE EXTING", "FIRERESISTANCE", "FIRE ALARM",
    "CARB MONOX", "CARBON MONOX",
    "LIFE SAFETY", "EXIT SIGN",
    "OBSTRUCTION", "EXIT WAY", "EGRESS", "DOOR SWING IN DIR",
    "STRUCTURAL", "STRUCTURAL RPT",
    "OVERCROWD",
    "UNAPPROVED HEATING", "GAS LEAK",
    "WIRE/EQUIP IMPROPERLY", "NOT CONFORM TO PRC", "GFCI RECEPTACLE",
    "TAPS/SPLICES", "BRANCH CIRCUIT", "ELECTRICAL HAZARD",
    "MIXED OCCUPANCY SEPARATION",
    "GARAGE TO RESIDENTIAL",
  ];
  if (criticalPatterns.some((p) => desc.includes(p))) return "critical";

  const highPatterns = [
    "HEAT UNIT ADEQUATELY", "HEATING DEVICE", "HEAT SUPPLY",
    "REPAIR EXTERIOR WALL", "REPAIR ROOF", "REPAIR LINTEL",
    "REPAIR PORCH", "REPAIR EXTERIOR STAIR",
    "REPAIR INTERIOR STAIR",
    "MICE", "RODENT", "ROACH", "BED BUG", "PEST",
    "WATER DAMAGE", "WATER SEEPAGE", "SEEPAGE",
    "SAFE WORKING CONDITION",
    "REPAIR FLOOR",
  ];
  if (highPatterns.some((p) => desc.includes(p))) return "high";

  const moderatePatterns = [
    "REPAIR INTERIOR WALL", "REPAIR CEILING", "WALLS/CEILING",
    "REPAIR DOOR", "DOOR HARDWARE",
    "WINDOW REPAIR", "WINDOW",
    "DWELLING CLEAN", "SANITARY",
    "REFUSE CONTAINER",
    "SERVICE WALK", "PASSAGE", "AREAWAY",
    "REPAIR EAVES",
  ];
  if (moderatePatterns.some((p) => desc.includes(p))) return "moderate";

  const lowPatterns = [
    "WEED", "HIGH WEEDS", "CUT OR REMOVE",
    "DEBRIS", "NUISANCE", "STOP/REMOVE",
    "ADVERTISING", "PERMZ",
  ];
  if (lowPatterns.some((p) => desc.includes(p))) return "low";

  const adminPatterns = [
    "ARRANGE PREMISE", "ARRANGE FOR REINSPECTION",
    "POST OWNER", "MANAGERS NAME",
    "PROVIDE", "SUBMIT",
    "PLANS & PERMITS", "PERMIT",
    "RENTAL LICENSE",
    "VACANT STRUCTURE LICENSE",
  ];
  if (adminPatterns.some((p) => desc.includes(p))) return "administrative";
  if (c.startsWith("9-") || c.startsWith("A-")) return "administrative";

  if (c.startsWith("E-")) return "high";
  if (c.startsWith("CN")) return "moderate";

  return "moderate";
}

function severityPenalty(severity: string): number {
  switch (severity) {
    case "critical": return 6;
    case "high": return 4;
    case "moderate": return 3;
    case "low": return 1;
    case "administrative": return 1;
    default: return 3;
  }
}

function agePenalty(violationDate?: string | null): number {
  if (!violationDate) return 0;
  const filed = new Date(violationDate).getTime();
  if (isNaN(filed)) return 0;
  const daysOpen = (Date.now() - filed) / (1000 * 60 * 60 * 24);
  if (daysOpen > 365) return 3;
  if (daysOpen > 180) return 2;
  if (daysOpen > 90) return 1;
  return 0;
}

export function calculateComplianceScore(params: {
  violations: ViolationForScoring[];
  resolvedCount: number;
  pendingVerificationCount: number;
  overdueDeadlines: number;
  fastResolutions: number;
  recurringIssues: number;
  deadlinesMet: number;
  deadlinesMissed: number;
}): ComplianceScoreResult {
  let score = 100;
  const factors: ComplianceScoreResult["factors"] = [];

  const openViolations = params.violations.filter(
    (v) => (v.violation_status ?? "").toUpperCase() === "OPEN" && v.user_resolution_status !== "pending_verification"
  );
  const totalViolations = params.violations.length;

  let criticalCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;
  let adminCount = 0;
  let totalSeverityPenalty = 0;
  let totalAgePenalty = 0;

  for (const v of openViolations) {
    const severity = getViolationSeverity(v.violation_description, v.violation_code);
    const sevPen = severityPenalty(severity);
    const agePen = agePenalty(v.violation_date);
    totalSeverityPenalty += sevPen;
    totalAgePenalty += agePen;

    switch (severity) {
      case "critical": criticalCount++; break;
      case "high": highCount++; break;
      case "moderate": moderateCount++; break;
      case "low": lowCount++; break;
      case "administrative": adminCount++; break;
    }
  }

  const violationPenalty = Math.min(totalSeverityPenalty, 45);
  if (violationPenalty > 0) {
    const parts: string[] = [];
    if (criticalCount > 0) parts.push(`${criticalCount} critical`);
    if (highCount > 0) parts.push(`${highCount} high`);
    if (moderateCount > 0) parts.push(`${moderateCount} moderate`);
    if (lowCount > 0) parts.push(`${lowCount} low`);
    if (adminCount > 0) parts.push(`${adminCount} administrative`);
    score -= violationPenalty;
    factors.push({
      label: "Open violations (severity-weighted)",
      impact: -violationPenalty,
      detail: parts.join(", "),
    });
  }

  const agePenaltyTotal = Math.min(totalAgePenalty, 15);
  if (agePenaltyTotal > 0) {
    score -= agePenaltyTotal;
    factors.push({
      label: "Aging violations",
      impact: -agePenaltyTotal,
      detail: `${openViolations.filter((v) => agePenalty(v.violation_date) > 0).length} violation(s) open over 3 months`,
    });
  }

  if (params.resolvedCount > 0) {
    const bonus = Math.min(params.resolvedCount * 5, 20);
    score += bonus;
    factors.push({
      label: "Resolved violations",
      impact: bonus,
      detail: `${params.resolvedCount} resolved`,
    });
  }

  if (params.pendingVerificationCount > 0) {
    const bonus = Math.min(params.pendingVerificationCount * 2, 6);
    score += bonus;
    factors.push({
      label: "Pending verification",
      impact: bonus,
      detail: `${params.pendingVerificationCount} awaiting city confirmation`,
    });
  }

  if (params.overdueDeadlines > 0) {
    const penalty = Math.min(params.overdueDeadlines * 5, 15);
    score -= penalty;
    factors.push({
      label: "Overdue deadlines",
      impact: -penalty,
      detail: `${params.overdueDeadlines} overdue`,
    });
  }

  if (params.fastResolutions > 0) {
    const bonus = Math.min(params.fastResolutions * 3, 15);
    score += bonus;
    factors.push({
      label: "Fast resolutions",
      impact: bonus,
      detail: `${params.fastResolutions} resolved within 14 days`,
    });
  }

  if (params.recurringIssues > 0) {
    const penalty = Math.min(params.recurringIssues * 3, 12);
    score -= penalty;
    factors.push({
      label: "Recurring issues",
      impact: -penalty,
      detail: `${params.recurringIssues} ongoing problem(s)`,
    });
  }

  if (params.deadlinesMet > 0) {
    const bonus = Math.min(params.deadlinesMet * 3, 12);
    score += bonus;
    factors.push({
      label: "Deadlines met",
      impact: bonus,
      detail: `${params.deadlinesMet} met`,
    });
  }
  if (params.deadlinesMissed > 0) {
    const penalty = Math.min(params.deadlinesMissed * 2, 10);
    score -= penalty;
    factors.push({
      label: "Deadlines missed",
      impact: -penalty,
      detail: `${params.deadlinesMissed} missed`,
    });
  }

  if (totalViolations === 0) {
    factors.push({
      label: "Clean record",
      impact: 0,
      detail: "No violations on file",
    });
  }

  score = clamp(score, 0, 100);
  const { grade, gradeColor } = getGrade(score);

  return { score, grade, gradeColor, factors };
}
