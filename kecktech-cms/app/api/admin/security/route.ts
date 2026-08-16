import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    twoFactorEnabled: user.twoFactorEnabled,
    hasSecret: Boolean(user.twoFactorSecret),
    // Only expose secret while setting up (enabled=false but secret present, or just generated)
    setupUri:
      user.twoFactorSecret && !user.twoFactorEnabled
        ? otpauthUrl(user.email, user.twoFactorSecret)
        : null,
    secretPreview:
      user.twoFactorSecret && !user.twoFactorEnabled
        ? user.twoFactorSecret
        : null,
  });
}

const bodySchema = z.object({
  action: z.enum(["generate", "enable", "disable"]),
  token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { action, token } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "generate") {
    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    return NextResponse.json({
      ok: true,
      secret,
      setupUri: otpauthUrl(user.email, secret),
    });
  }

  if (action === "enable") {
    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Generate a secret first" },
        { status: 400 }
      );
    }
    if (!token || !verifyTotp(user.twoFactorSecret, token)) {
      return NextResponse.json(
        { error: "Invalid authenticator code" },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    return NextResponse.json({ ok: true, twoFactorEnabled: true });
  }

  // disable
  if (!token || !user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, token)) {
    // Allow disable with password-only for admins who lost the device: require correct current TOTP if enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Valid authenticator code required to disable 2FA" },
        { status: 400 }
      );
    }
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  return NextResponse.json({ ok: true, twoFactorEnabled: false });
}
