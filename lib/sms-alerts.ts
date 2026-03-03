import twilio from "twilio";

// Note: Twilio trial accounts can only send SMS to verified phone numbers.

export async function sendNewViolationSMS(
  phoneNumber: string,
  propertyAddress: string,
  newViolationsCount: number,
  complaintCount: number,
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) {
      return { success: false, error: "Missing Twilio env vars" };
    }

    const client = twilio(accountSid, authToken);
    const body = `CasAlert: ${newViolationsCount} new violation(s) at ${propertyAddress}. ${complaintCount} are COMPLAINT type. View: https://casalert.vercel.app/dashboard/${propertyId}`;

    await client.messages.create({
      to: phoneNumber,
      from,
      body,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function sendReminderSMS(
  phoneNumber: string,
  propertyAddress: string,
  violationDescription: string,
  deadlineDate: string,
  daysRemaining: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) {
      return { success: false, error: "Missing Twilio env vars" };
    }

    const client = twilio(accountSid, authToken);
    const body = `CasAlert Reminder: ${violationDescription} at ${propertyAddress}. Deadline: ${deadlineDate} (${daysRemaining} days left).`;

    await client.messages.create({
      to: phoneNumber,
      from,
      body,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

