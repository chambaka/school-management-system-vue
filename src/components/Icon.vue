<script setup>
const props = defineProps({
  name: { type: String, required: true },
});

const paths = {
  mail: "M4 6h16v12H4V6zm0 0 8 7 8-7",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  download: "M12 3v12M7 11l5 5 5-5M5 21h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  home: "M4 11 12 4l8 7v9H4z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4h16v16H6.5A2.5 2.5 0 0 1 4 17.5z",
  calendar: "M4 6h16v14H4zM4 10h16M8 4v4M16 4v4",
  check: "M5 12l5 5L20 7",
  partial: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10",
  unpaid: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  coin: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v8m-3 0h6",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9zm4 13a2 2 0 0 0 4 0",
  palette: "M12 22a10 10 0 1 1 0-20 4 4 0 0 1 0 8h-1a3 3 0 0 0-3 3 2 2 0 0 0 2 2z",
  shield: "M12 3 4 7v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V7z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3",
  school: "M3 10 12 4l9 6v8H3zM7 22V12h10v10",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  more: "M4 7h16M4 12h16M4 17h16",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  plus: "M12 5v14M5 12h14",
  refresh: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5",
  pen: "M13.5 6.5 17.5 10.5M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8L16.3 4.5a2 2 0 0 0-2.8 0L4 14v6z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4",
  chevron: "M6 9l6 6 6-6",
  grip: "M8 7h2M14 7h2M8 12h2M14 12h2M8 17h2M14 17h2",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  "fee-tuition": "M3 10 12 5l9 5-9 5-9-5zM6.5 12.2V16c0 1.4 2.4 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-3.8",
  "fee-transport": "M4 6h16v9H4zM4 11h16M7 15v2M17 15v2M7 8h3M14 8h3",
  "fee-exam": "M8 3h8v3H8zM6 5h12v15H6zM9 12l2 2 4-4",
  "fee-library": "M4 5h5v14H4zM10 8h5v11h-5zM16 4h4v15h-4",
  "fee-sports": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 12h17M12 3c-2.4 3-2.4 15 0 18M12 3c2.4 3 2.4 15 0 18",
  "fee-uniform": "M9 4l3 3 3-3 4 3-2 3v10H7V10L5 7z",
  "fee-meals": "M7 3v6M5 3v4a2 2 0 0 0 4 0V3M7 9v12M17 3v18M15 3h4v5h-4z",
  "fee-boarding": "M3 11h18M3 11V7h6a3 3 0 0 1 3 3H3M3 15h18M6 15v4M18 15v4",
  "fee-other": "M12 3 3 12l9 9 9-9V3zM16 8h.01",
};
</script>

<template>
  <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round">
    <path :d="paths[name] || paths.list" />
  </svg>
</template>

<style scoped>
.ico { width: 1.05rem; height: 1.05rem; flex-shrink: 0; }
</style>
