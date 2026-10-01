import { computed, ref, unref } from "vue";
import { isLoginLocked, statusLabel } from "./status";

const TIE_KEYS = ["name", "email", "school", "tenant", "role", "status"];

export function compareText(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function accountStatus(row) {
  if (row?.status) {
    const label = statusLabel(row.status);
    return isLoginLocked(row) ? `${label} locked` : label;
  }
  if (row?.enabled === false) return "Disabled";
  if (isLoginLocked(row)) return "Locked";
  return "Active";
}

export function useTableSort(source, getters, defaultKey = "name") {
  const sortKey = ref(defaultKey);
  const sortDir = ref("asc");

  function toggleSort(key) {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
    } else {
      sortKey.value = key;
      sortDir.value = "asc";
    }
  }

  function ariaSort(key) {
    if (sortKey.value !== key) return "none";
    return sortDir.value === "desc" ? "descending" : "ascending";
  }

  const sortedRows = computed(() => {
    const list = unref(source) || [];
    const get = getters[sortKey.value];
    const dir = sortDir.value === "desc" ? -1 : 1;
    return [...list].sort((a, b) => {
      if (get) {
        const primary = dir * compareText(get(a), get(b));
        if (primary !== 0) return primary;
      }
      for (const key of TIE_KEYS) {
        if (key === sortKey.value || !getters[key]) continue;
        const next = compareText(getters[key](a), getters[key](b));
        if (next !== 0) return next;
      }
      return 0;
    });
  });

  return { sortKey, sortDir, toggleSort, ariaSort, sortedRows };
}
