<script setup>
defineProps({
  size: { type: Number, default: 108 },
});
</script>

<template>
  <div class="crest" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <i class="ring ring-outer" />
    <i class="ring ring-inner" />
    <svg viewBox="0 0 80 80">
      <defs>
        <linearGradient id="shuleGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff3c4" />
          <stop offset="0.45" stop-color="#F5C451" />
          <stop offset="1" stop-color="#c9891a" />
        </linearGradient>
      </defs>
      <path
        fill="url(#shuleGold)"
        d="M18 46c0-8 6-16 14-20 3-1 7-2 10-2h2c8 0 16 6 18 14 1 4 0 8-2 12-3 6-9 10-16 11h-4c-8-1-15-6-18-13-2-4-3-8-4-2zm16-8c-3 2-5 6-5 10 0 5 3 9 8 10h3c6 0 10-4 11-9 1-4-1-8-4-10-2-2-5-3-8-3h-1c-2 0-3 1-4 2z"
      />
      <path
        fill="url(#shuleGold)"
        d="M28 22h24v4H28zm4 4h4v8h-4zm12 0h4v8h-4zm-16 8h24l-2 4H30zm8-16 8-6 8 6v4H40z"
      />
    </svg>
  </div>
</template>

<style scoped>
.crest {
  position: relative;
  display: grid;
  place-items: center;
  filter: drop-shadow(0 0 22px color-mix(in srgb, var(--primary) 55%, transparent));
}
svg { width: 58%; height: 58%; position: relative; z-index: 1; }
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}
.ring-outer {
  border: 2px solid color-mix(in srgb, var(--primary) 80%, white);
  box-shadow:
    0 0 0 8px color-mix(in srgb, var(--primary) 12%, transparent),
    0 0 40px color-mix(in srgb, var(--primary) 35%, transparent);
}
.ring-inner {
  inset: 10px;
  border: 1px solid color-mix(in srgb, var(--secondary) 70%, transparent);
}
</style>
