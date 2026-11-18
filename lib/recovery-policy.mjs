export const MAX_RECOVERY_DRAFTS = 30;
export function makeRecoveryKey(owner, workbook) {
  if (typeof owner !== "string" || !owner) throw new Error("Missing recovery session.");
  const identity = workbook.id || workbook.sheets?.[0]?.id;
  if (typeof identity !== "string" || !identity) throw new Error("Missing workbook identity.");
  return JSON.stringify([owner, identity]);
}
export function makeRecoveryRecord(key, name, backup, now = new Date().toISOString()) {
  if (typeof key !== "string" || !key || typeof name !== "string" || !name.trim() || typeof backup !== "string" || !backup) throw new Error("Invalid recovery record.");
  return {key, name, backup, capturedAt:now};
}
export function canWriteRecovery(keys, key) {
  return keys.includes(key) || keys.length < MAX_RECOVERY_DRAFTS;
}
