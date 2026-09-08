<script setup>
import { computed } from "vue";
import { useBrandingStore } from "../stores/branding";
import { useConfigStore } from "../stores/config";
import smsLogo from "../assets/sms-logo.png";

const branding = useBrandingStore();
const config = useConfigStore();

const contextName = computed(
  () => branding.current?.name || config.organizationName || "",
);
const displayPlace = computed(() => {
  if (branding.current?.country) return `${branding.current.country} · School`;
  if (config.singleTenant) return "Sign in to manage your organization";
  return "Sign in or register your organization";
});
</script>

<template>
  <div class="guest">
    <aside class="brand glass">
      <div class="mark-wrap">
        <img :src="smsLogo" alt="ShuleHub School Management System" class="mark" />
      </div>
      <h1 class="kicker">ShuleHub School Management System</h1>
      <p class="tag">Academics, people, and school operations in one place.</p>
      <p class="place">{{ displayPlace }}</p>
      <p v-if="contextName" class="org">{{ contextName }}</p>
    </aside>
    <main class="panel glass card">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.guest {
  min-height: 100dvh;
  display: grid;
  gap: 1.2rem;
  padding:
    max(1.15rem, env(safe-area-inset-top, 0px))
    max(1.15rem, env(safe-area-inset-right, 0px))
    max(1.15rem, env(safe-area-inset-bottom, 0px))
    max(1.15rem, env(safe-area-inset-left, 0px));
}
.brand {
  padding: 2rem 1.6rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.mark-wrap {
  width: 148px;
  height: 148px;
  border-radius: 50%;
  padding: 6px;
  background:
    radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--primary) 28%, transparent), transparent 62%),
    rgba(4, 10, 22, 0.55);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--primary) 42%, transparent),
    0 18px 40px rgba(0, 0, 0, 0.35),
    0 0 36px color-mix(in srgb, var(--primary) 22%, transparent);
}
.mark {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.kicker {
  margin: 1.35rem 0 0;
  letter-spacing: 0.04em;
  color: var(--primary);
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.35;
  max-width: 18ch;
}
.tag {
  margin: 0.7rem 0 0;
  color: var(--text);
  font-weight: 650;
  max-width: 28ch;
  line-height: 1.4;
}
.place { color: var(--muted); margin: 0.45rem 0 0; }
.org {
  margin: 0.85rem 0 0;
  display: inline-flex;
  align-self: flex-start;
  color: var(--secondary);
  border: 1px solid color-mix(in srgb, var(--secondary) 40%, transparent);
  background: color-mix(in srgb, var(--secondary) 12%, transparent);
  border-radius: 999px;
  padding: 0.32rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 800;
}
.panel { align-self: center; padding: 1.6rem 1.45rem 1.5rem; }
@media (min-width: 920px) {
  .guest {
    grid-template-columns: 1.05fr 0.95fr;
    align-items: stretch;
    padding:
      max(2.2rem, env(safe-area-inset-top, 0px))
      max(2.2rem, env(safe-area-inset-right, 0px))
      max(2.2rem, env(safe-area-inset-bottom, 0px))
      max(2.2rem, env(safe-area-inset-left, 0px));
    gap: 1.4rem;
  }
  .brand { padding: 3rem 2.4rem; }
  .mark-wrap { width: 168px; height: 168px; }
}
</style>
