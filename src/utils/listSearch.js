import { computed, ref, unref } from "vue";

export function normalizeSearch(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(normalizeSearch).filter(Boolean).join(" ");
  return String(value).toLowerCase();
}

export function matchesSearch(query, ...values) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return values.some((value) => normalizeSearch(value).includes(q));
}

export function useListSearch(source, fields) {
  const query = ref("");
  const filteredRows = computed(() => {
    const list = unref(source) || [];
    return list.filter((row) => {
      const values = typeof fields === "function"
        ? fields(row)
        : (fields || []).map((key) => row?.[key]);
      return matchesSearch(query.value, ...values);
    });
  });
  return { query, filteredRows };
}
