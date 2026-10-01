export const FEE_TYPES = [
  { value: "TUITION", label: "Tuition", icon: "fee-tuition" },
  { value: "TRANSPORT", label: "Transport", icon: "fee-transport" },
  { value: "EXAM", label: "Exam", icon: "fee-exam" },
  { value: "LIBRARY", label: "Library", icon: "fee-library" },
  { value: "SPORTS", label: "Sports", icon: "fee-sports" },
  { value: "UNIFORM", label: "Uniform", icon: "fee-uniform" },
  { value: "MEALS", label: "Meals", icon: "fee-meals" },
  { value: "BOARDING", label: "Boarding", icon: "fee-boarding" },
  { value: "OTHER", label: "Other", icon: "fee-other" },
];

export function feeTypeIcon(type) {
  return FEE_TYPES.find((row) => row.value === type)?.icon || "fee-other";
}

export function feeIconForText(text) {
  const value = String(text || "").trim().toLowerCase();
  const hit = FEE_TYPES.find((row) => value.startsWith(row.label.toLowerCase()));
  return hit?.icon || "fee-other";
}
