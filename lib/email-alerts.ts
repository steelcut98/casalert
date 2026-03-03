import { Resend } from "resend";

type NewViolation = {
  inspection_category?: string | null;
  violation_date?: string | null;
  violation_code?: string | null;
  violation_description?: string | null;
  violation_status?: string | null;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(input: string | null | undefined) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isComplaint(category: string | null | undefined) {
  return (category ?? "").toUpperCase().includes("COMPLAINT");
}

function emailShell({
  title,
  bodyHtml,
}: {
  title: string;
  bodyHtml: string;
}) {
  return `
  <div style="margin:0;padding:0;background:#f5f5f5;">
    <div style="max-width:720px;margin:0 auto;padding:24px 16px;">
      <div style="background:#1a1a1a;color:#ffffff;border-radius:10px 10px 0 0;padding:14px 16px;">
        <span style="font-weight:700;font-size:16px;letter-spacing:0.2px;">CasAlert</span>
      </div>
      <div style="background:#ffffff;border-radius:0 0 10px 10px;padding:18px 16px;border:1px solid #e0e0e0;border-top:none;">
        <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
          <div style="font-weight:700;font-size:18px;margin:0 0 10px 0;">${escapeHtml(
            title
          )}</div>
          ${bodyHtml}
          <div style="margin-top:20px;color:#6b6b6b;font-size:12px;line-height:1.4;">
            <div>Data sourced from public municipal records. CasAlert is not a legal service. Always verify directly with your city Department of Buildings.</div>
            <div style="margin-top:6px;">
              Manage alert preferences: <a style="color:#6b6b6b;" href="https://casalert.vercel.app/settings">https://casalert.vercel.app/settings</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

export async function sendNewViolationEmail(
  userEmail: string,
  propertyAddress: string,
  propertyId: string,
  newViolations: NewViolation[],
  citySlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const count = newViolations.length;
    const nowLabel = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const rows = newViolations
      .map((v) => {
        const complaint = isComplaint(v.inspection_category);
        const typeStyle = complaint
          ? "padding:10px 8px;border-left:4px solid #dc2626;color:#dc2626;font-weight:700;"
          : "padding:10px 8px;border-left:4px solid transparent;color:#1a1a1a;font-weight:600;";
        const tdStyle = "padding:10px 8px;border-top:1px solid #e0e0e0;vertical-align:top;font-size:13px;";
        return `
          <tr>
            <td style="${typeStyle}">${escapeHtml(v.inspection_category ?? "—")}</td>
            <td style="${tdStyle}">${escapeHtml(formatDate(v.violation_date))}</td>
            <td style="${tdStyle}">${escapeHtml(v.violation_code ?? "—")}</td>
            <td style="${tdStyle}">${escapeHtml(v.violation_description ?? "—")}</td>
            <td style="${tdStyle}">${escapeHtml((v.violation_status ?? "—").toString())}</td>
          </tr>
        `;
      })
      .join("");

    const bodyHtml = `
      <div style="color:#4a4a4a;font-size:13px;margin-bottom:12px;">
        ${count} new violation(s) found · ${escapeHtml(citySlug)} · ${escapeHtml(nowLabel)}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="text-align:left;padding:10px 8px;font-size:12px;color:#4a4a4a;border-bottom:1px solid #e0e0e0;">Type</th>
            <th style="text-align:left;padding:10px 8px;font-size:12px;color:#4a4a4a;border-bottom:1px solid #e0e0e0;">Date</th>
            <th style="text-align:left;padding:10px 8px;font-size:12px;color:#4a4a4a;border-bottom:1px solid #e0e0e0;">Code</th>
            <th style="text-align:left;padding:10px 8px;font-size:12px;color:#4a4a4a;border-bottom:1px solid #e0e0e0;">Description</th>
            <th style="text-align:left;padding:10px 8px;font-size:12px;color:#4a4a4a;border-bottom:1px solid #e0e0e0;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top:16px;">
        <a href="https://casalert.vercel.app/dashboard/${encodeURIComponent(
          propertyId
        )}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;font-size:13px;">
          View property details
        </a>
      </div>
    `;

    const html = emailShell({
      title: `New violations detected at ${propertyAddress}`,
      bodyHtml,
    });

    await resend.emails.send({
      from: "CasAlert <onboarding@resend.dev>",
      to: userEmail,
      subject: `New violations detected at ${propertyAddress}`,
      html,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function sendReminderEmail(
  userEmail: string,
  propertyAddress: string,
  propertyId: string,
  violationDescription: string,
  violationCode: string,
  deadlineDate: string,
  daysRemaining: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const banner =
      daysRemaining <= 3
        ? { bg: "#fee2e2", border: "#dc2626", text: "#7f1d1d" }
        : daysRemaining <= 7
          ? { bg: "#fef3c7", border: "#d97706", text: "#78350f" }
          : { bg: "#f5f5f5", border: "#e0e0e0", text: "#4a4a4a" };

    const bodyHtml = `
      <div style="background:${banner.bg};border:1px solid ${banner.border};color:${banner.text};padding:10px 12px;border-radius:10px;margin-bottom:14px;font-size:13px;">
        Reminder notification
      </div>
      <div style="font-size:14px;line-height:1.4;color:#1a1a1a;">
        <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(
          violationDescription
        )}</div>
        <div style="color:#4a4a4a;margin-bottom:10px;">Code: ${escapeHtml(
          violationCode || "—"
        )}</div>
        <div style="color:#4a4a4a;margin-bottom:14px;">
          Your deadline of ${escapeHtml(deadlineDate)} is <strong>${daysRemaining}</strong> days away.
        </div>
      </div>
      <div style="margin-top:10px;">
        <a href="https://casalert.vercel.app/dashboard/${encodeURIComponent(
          propertyId
        )}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700;font-size:13px;">
          View property details
        </a>
      </div>
    `;

    const subject = `Reminder: ${violationDescription} at ${propertyAddress} — ${daysRemaining} days left`;

    const html = emailShell({
      title: subject,
      bodyHtml,
    });

    await resend.emails.send({
      from: "CasAlert <onboarding@resend.dev>",
      to: userEmail,
      subject,
      html,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

