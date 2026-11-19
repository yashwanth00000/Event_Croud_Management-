import { NextResponse } from 'next/server';
export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  if (message.includes('Unique constraint')) return NextResponse.json({ error: 'A record with these details already exists' }, { status: 409 });
  if (message.includes('Foreign key constraint')) return NextResponse.json({ error: 'Related record was not found' }, { status: 400 });
  return NextResponse.json({ error: message }, { status: 500 });
}
export function badRequest(message: string) { return NextResponse.json({ error: message }, { status: 400 }); }
