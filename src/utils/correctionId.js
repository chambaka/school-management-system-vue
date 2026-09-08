const KEY = "shulehub.correctionId";

export function correctionId() {
  let value = sessionStorage.getItem(KEY);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(KEY, value);
  }
  return value;
}

export function rememberCorrectionId(value) {
  if (value && /^[A-Za-z0-9._-]{8,64}$/.test(value)) {
    sessionStorage.setItem(KEY, value);
  }
}
