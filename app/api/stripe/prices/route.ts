import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    starterMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    starterAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? "",
    proMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  });
}
