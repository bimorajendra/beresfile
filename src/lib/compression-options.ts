export const COMPRESSION_PRESETS = [50, 100, 200, 300, 500, 1024] as const;
export const MIN_TARGET_KB = 1;
export const MAX_TARGET_KB = 25 * 1024;

export function parseTargetKB(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined;
  const target = Number(value);
  return Number.isSafeInteger(target) && target >= MIN_TARGET_KB && target <= MAX_TARGET_KB ? target : undefined;
}

export function targetLabel(kb: number): string {
  return kb === 1024 ? '1 MB' : `${kb.toLocaleString('id-ID')} KB`;
}
