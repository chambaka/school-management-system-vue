export function emptyAddress() {
  return { line: "", region: "", district: "", ward: "", box: "" };
}

export function parseAddress(raw) {
  if (!raw) return emptyAddress();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1) {
      return {
        line: parsed.line || "",
        region: parsed.region || "",
        district: parsed.district || "",
        ward: parsed.ward || "",
        box: parsed.box || "",
      };
    }
  } catch {
    /* older free-text addresses stay in the street field */
  }
  return { ...emptyAddress(), line: String(raw) };
}

export function encodeAddress(addr) {
  const line = (addr?.line || "").trim();
  const region = (addr?.region || "").trim();
  const district = (addr?.district || "").trim();
  const ward = (addr?.ward || "").trim();
  const box = (addr?.box || "").trim();
  if (!line || !region || !district || !ward) return null;
  return JSON.stringify({ v: 1, line, region, district, ward, box });
}

export function formatLocationName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/(^|[\s/'-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function formatAddress(raw) {
  const address = parseAddress(raw);
  if (!address.region && !address.district && !address.ward) return address.line;
  const place = [
    address.line,
    formatLocationName(address.ward),
    formatLocationName(address.district),
    formatLocationName(address.region),
  ].filter(Boolean).join(", ");
  return address.box ? `${place}, P.O. Box ${address.box}` : place;
}
