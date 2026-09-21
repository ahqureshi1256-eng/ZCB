/**
 * Helper to get the correct public, shareable URL for customers.
 * 
 * In Google AI Studio / Cloud Run environments:
 * - ais-dev-* is a private dev instance that requires authentication (causes "403. That's an error. You do not have access to this page" for anyone else or on mobile).
 * - ais-pre-* is the public preview / shared URL accessible by anyone without Google login!
 */
export function getPublicCustomerUrl(): string {
  if (typeof window === 'undefined') return '';

  let origin = window.location.origin;

  // In Google AI Studio / Cloud Run environments:
  // ais-dev-* requires Google account authentication (causing 403 Forbidden).
  // ais-pre-* is the publicly shared preview URL accessible by anyone without login.
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  // Use clean origin with trailing slash so web server and Cloud Run reverse proxy serve index.html directly without 404
  return `${origin}/`;
}

export function isDevUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('ais-dev-');
}

