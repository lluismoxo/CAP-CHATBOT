import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString('base64');
  const dev = process.env.NODE_ENV !== 'production';
  const frames = "'self' https://capconsultor.eu https://www.capconsultor.eu https://cap-sigma-two.vercel.app" + (dev ? ' http://localhost:3001 http://127.0.0.1:3001' : '');
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors ${frames};${dev ? '' : ' upgrade-insecure-requests;'}`;
  const headers = new Headers(request.headers);headers.set('Content-Security-Policy',csp);headers.set('x-nonce',nonce);
  const response=NextResponse.next({request:{headers}});
  response.headers.set('Content-Security-Policy',csp);response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config={matcher:['/']};
