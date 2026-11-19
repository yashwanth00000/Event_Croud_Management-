import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE = 'eventcrowd_session';
const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters');

type Claims = { sub: string; exp: number; iat: number };
const b64 = (v: string | Buffer) => Buffer.from(v).toString('base64url');
function sign(payload: Claims) {
  const body = b64(JSON.stringify(payload));
  const sig = createHmac('sha256', secret!).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token: string): Claims | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret!).update(body).digest();
  let actual: Buffer;
  try { actual = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as Claims;
    return claims.exp > Math.floor(Date.now() / 1000) ? claims : null;
  } catch { return null; }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function createSession(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = sign({ sub: userId, iat: now, exp: now + 60 * 60 * 12 });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12 });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }
export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const claims = verify(token);
  if (!claims) return null;
  return prisma.user.findUnique({ where: { id: claims.sub }, include: { roles: { include: { role: true } } } });
}
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== 'ACTIVE') throw new Error('UNAUTHORIZED');
  return user;
}
export async function requireRoles(...allowed: string[]) {
  const user = await requireUser();
  const roles = user.roles.map((r) => r.role.name.toUpperCase());
  if (!roles.some((role) => allowed.includes(role))) throw new Error('FORBIDDEN');
  return user;
}
