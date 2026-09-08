export function persistPhone(raw) {
  if (raw == null) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0") && digits.length === 10) return `255${digits.slice(1)}`;
  if (digits.startsWith("255") && digits.length >= 12) return digits;
  if (digits.length === 9) return `255${digits}`;
  return digits;
}

export function localPhone(raw) {
  const persisted = persistPhone(raw);
  if (persisted.startsWith("255") && persisted.length >= 12) return persisted.slice(3);
  if (persisted.startsWith("0") && persisted.length >= 2) return persisted.slice(1);
  return persisted;
}
