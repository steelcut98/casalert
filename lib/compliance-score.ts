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

export function calculateComplianceScore(params: {
  totalViolations: number;
  openViolations: number;
  complaintViolations: number;
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

  if (params.openViolations > 0) {
    const penalty = Math.min(params.openViolations * 3, 30);
    score -= penalty;
    factors.push({
      label: "Open violations",
      impact: -penalty,
      detail: `${params.openViolations} open violation${params.openViolations !== 1 ? "s" : ""}`,
    });
  }

  if (params.complaintViolations > 0) {
    const penalty = Math.min(params.complaintViolations * 2, 20);
    score -= penalty;
    factors.push({
      label: "Complaint violations",
      impact: -penalty,
      detail: `${params.complaintViolations} complaint${params.complaintViolations !== 1 ? "s" : ""}`,
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
      detail: `${params.recurringIssues} ongoing problem${params.recurringIssues !== 1 ? "s" : ""}`,
    });
  }

  if (params.deadlinesMet > 0) {
    const bonus = Math.min(params.deadlinesMet * 3, 12);
    score += bonus;
    factors.push({
      label: "Deadlines met",
      impact: bonus,
      detail: `${params.deadlinesMet} deadline${params.deadlinesMet !== 1 ? "s" : ""} met`,
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

  if (params.totalViolations === 0) {
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
