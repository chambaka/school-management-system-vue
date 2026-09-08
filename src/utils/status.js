export function statusLabel(status) {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  if (status === "ARCHIVED") return "Archived";
  return status || "";
}
