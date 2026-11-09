<script setup>
import { useId } from "vue";

defineProps({
  size: { type: Number, default: 48 },
});

const uid = useId();
</script>

<template>
  <svg
    class="mark"
    :style="{ width: size + 'px', height: size + 'px' }"
    viewBox="0 0 64 64"
    role="img"
    aria-label="ShuleHub"
  >
    <defs>
      <linearGradient :id="`${uid}-gold`" x1="8" y1="12" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffe9a0" />
        <stop offset="0.42" stop-color="#FDB813" />
        <stop offset="1" stop-color="#c9891a" />
      </linearGradient>
      <linearGradient :id="`${uid}-page`" x1="14" y1="18" x2="32" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffe6a0" />
        <stop offset="1" stop-color="#FDB813" />
      </linearGradient>
    </defs>
    <path
      :fill="`url(#${uid}-page)`"
      d="M8.5 22.5c8.8 5.2 15.2 5 23.5-1.4v30.8C23.8 57.6 16.6 57.8 8.5 52.8V22.5z"
    />
    <path
      :fill="`url(#${uid}-gold)`"
      d="M32 21.1c8.4 6.4 14.8 6.6 23.5 1.4v30.3c-8.2 5-15.4 4.8-23.5-1.4V21.1z"
    />
    <path
      fill="none"
      stroke="#c9891a"
      stroke-opacity="0.35"
      stroke-width="1.15"
      stroke-linecap="round"
      d="M13 31.5h13.5M13 37.2h11.8M13 42.8h12.6M37.5 31.2h13.2M38.2 36.9h11.6M37.8 42.5h12.4"
    />
    <path
      fill="none"
      stroke="#fff6d2"
      stroke-width="1.7"
      stroke-linecap="round"
      d="M32 20.8v31.2"
    />
    <path
      fill="#fff6d2"
      d="M50.5 7.2 52 12.2l5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5z"
    />
  </svg>
</template>

<style scoped>
.mark {
  display: block;
  flex-shrink: 0;
  filter: drop-shadow(0 0 14px color-mix(in srgb, var(--primary) 48%, transparent));
}
</style>
