import { AuthUser } from '../types';

export const OWNER_EMAIL = 'a.hqureshi1256@gmail.com';

/**
 * Checks if the given authenticated user is the shop owner.
 * Supports standard gmail.com and the common user typo gamil.com.
 */
export function isOwner(user: AuthUser | null | undefined): boolean {
  if (!user || !user.email) return false;
  const cleanEmail = user.email.trim().toLowerCase().replace('gamil.com', 'gmail.com');
  return cleanEmail === OWNER_EMAIL;
}

export function getOwnerUser(): AuthUser {
  return {
    uid: 'owner_a_hqureshi1256',
    email: OWNER_EMAIL,
    displayName: 'A.H Qureshi (Shop Owner)',
    authMethod: 'google',
  };
}
