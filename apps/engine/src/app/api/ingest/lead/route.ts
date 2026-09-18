import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashKey, originAllowed } from '@/lib/keys';
import { limitsFor } from '@/lib/plan';

export const dynamic = 'force-dynamic';

// CORS: reflect the caller's origin only after we've validated the key's allow-list.
function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Engine-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// Preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  // 1. Resolve the activation key (header for server-to-server, body for embed.js).
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400, origin);
  }
  const rawKey = req.headers.get('x-engine-key') || body.key;
  if (!rawKey) return json({ ok: false, error: 'missing_key' }, 401, origin);

  const key = await prisma.activationKey.findUnique({
    where: { keyHash: hashKey(String(rawKey)) },
    include: { clinic: true },
  });
  if (!key || key.revoked) return json({ ok: false, error: 'invalid_key' }, 401, origin);
  if (key.clinic.status !== 'ACTIVE') return json({ ok: false, error: 'clinic_suspended' }, 403, origin);

  // 2. Origin allow-list check (defends a leaked key).
  if (!originAllowed(key.allowedOrigins, origin)) {
    return json({ ok: false, error: 'origin_not_allowed' }, 403, origin);
  }

  // 3. Plan lead cap (this calendar month).
  const limits = limitsFor(key.clinic.plan);
  if (limits.leadsPerMonth !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const used = await prisma.lead.count({
      where: { clinicId: key.clinicId, createdAt: { gte: startOfMonth } },
    });
    if (used >= limits.leadsPerMonth) {
      return json({ ok: false, error: 'lead_limit_reached', upgrade: true }, 402, origin);
    }
  }

  // 4. Minimal validation.
  const name = (body.name || '').toString().trim().slice(0, 191);
  const phone = (body.phone || '').toString().trim().slice(0, 40);
  const email = (body.email || '').toString().trim().slice(0, 191);
  if (!name || (!phone && !email)) {
    return json({ ok: false, error: 'name_and_contact_required' }, 422, origin);
  }

  // 5. Write the lead — scoped to the resolved clinic.
  await prisma.lead.create({
    data: {
      clinicId: key.clinicId,
      name,
      phone: phone || null,
      email: email || null,
      message: (body.message || '').toString().slice(0, 4000) || null,
      treatment: (body.treatment || '').toString().slice(0, 120) || null,
      source: (body.source || '').toString().slice(0, 120) || null,
      origin: origin || null,
      meta: body.meta ? JSON.stringify(body.meta).slice(0, 4000) : null,
    },
  });

  await prisma.activationKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  // TODO(Pro): fire WhatsApp/email alert when limits.alerts is true.

  return json({ ok: true }, 200, origin);
}

function json(payload: unknown, status: number, origin: string | null) {
  return NextResponse.json(payload, { status, headers: corsHeaders(origin) });
}
