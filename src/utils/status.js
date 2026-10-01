export function statusLabel(status) {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  if (status === "ARCHIVED") return "Archived";
  return status || "";
}

export function isLoginLocked(row) {
  return Boolean(row?.lockedUntil && Date.parse(row.lockedUntil) > Date.now());
}
