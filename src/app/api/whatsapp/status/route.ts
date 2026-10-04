import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/core/whatsapp/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getWhatsAppConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    return NextResponse.json({
      connected: false,
      error: "WhatsApp Cloud API credentials not configured in .env",
    });
  }

  try {
    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}?access_token=${config.accessToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        error: data.error?.message || "Failed to fetch WhatsApp Phone Number details",
        details: data,
      }, { status: 400 });
    }

    return NextResponse.json({
      connected: true,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
      apiVersion: config.apiVersion,
      verifyToken: config.verifyToken ? "Configured (Matches)" : "Missing",
      data: {
        verifiedName: data.verified_name,
        displayPhoneNumber: data.display_phone_number,
        qualityRating: data.quality_rating,
        platformType: data.platform_type,
        throughput: data.throughput,
        webhookUrl: data.webhook_configuration?.application,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      error: err.message,
    }, { status: 500 });
  }
}
