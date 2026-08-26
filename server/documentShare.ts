export const SHARE_DURATION_HOURS = [24, 72, 168, 720] as const;
export type ShareDurationHours = (typeof SHARE_DURATION_HOURS)[number];

export function getShareExpiry(hours: ShareDurationHours, now = new Date()): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export function isShareExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  return !expiresAt || expiresAt.getTime() <= now.getTime();
}
