import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/core/auth/session";
import { logAudit } from "@/core/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      action: "USER_LOGOUT",
      entityType: "USER",
      entityId: session.userId,
      reason: "User logged out voluntarily.",
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
