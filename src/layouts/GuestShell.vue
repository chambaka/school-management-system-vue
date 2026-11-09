<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import HaloCrest from "../components/HaloCrest.vue";
import loginHero from "../assets/login-hero.jpg";
import { useBrandingStore } from "../stores/branding";
import { useConfigStore } from "../stores/config";

const route = useRoute();
const branding = useBrandingStore();
const config = useConfigStore();

const immersive = computed(() => route.path === "/login");
const contextName = computed(
  () => branding.current?.name || config.organizationName || "",
);
const displayPlace = computed(() => {
  if (branding.current?.country) return `${branding.current.country} - School - Management`;
  if (config.singleTenant) return "Sign in to manage your organization";
  return "Sign in or register your organization";
});
</script>

<template>
  <div class="guest" :class="{ immersive }">
    <header class="hero-block">
      <div class="hero-top">
        <div class="wordmark">
          <HaloCrest :size="immersive ? 52 : 44" />
          <div>
            <h1 class="serif">
              <span class="brand-shule">Shule</span><span class="brand-hub">Hub</span>
            </h1>
            <p class="product">School Management System</p>
          </div>
        </div>
        <div v-if="immersive" class="hero-photo" aria-hidden="true">
          <img :src="loginHero" alt="" />
        </div>
      </div>
      <div class="hero-copy">
        <p v-if="immersive" class="tag">Academics, people, and school operations in one place.</p>
        <p class="place">{{ displayPlace }}</p>
        <p v-if="contextName" class="org">{{ contextName }}</p>
      </div>
    </header>
    <main class="panel glass card">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.guest {
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 1.15rem;
  padding:
    max(1.05rem, env(safe-area-inset-top, 0px))
    max(1.05rem, env(safe-area-inset-right, 0px))
    max(1.15rem, env(safe-area-inset-bottom, 0px))
    max(1.05rem, env(safe-area-inset-left, 0px));
}

.guest.immersive::before {
  content: "";
  position: absolute;
  z-index: -1;
  top: -8%;
  right: -28%;
  width: min(92vw, 34rem);
  height: min(58vw, 24rem);
  border-radius: 48% 52% 44% 56% / 42% 48% 52% 58%;
  background:
    radial-gradient(circle at 42% 40%, color-mix(in srgb, var(--secondary) 22%, transparent), transparent 68%),
    radial-gradient(circle at 70% 70%, color-mix(in srgb, #1b4f6e 55%, transparent), transparent 72%);
  transform: rotate(-8deg);
  pointer-events: none;
}

.hero-block {
  position: relative;
  min-width: 0;
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
}

.wordmark {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  flex: 1;
}

.wordmark h1 {
  margin: 0;
  font-size: clamp(1.85rem, 5vw, 2.35rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.brand-shule { color: var(--text); }
.brand-hub { color: var(--primary); }

.product {
  margin: 0.12rem 0 0;
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.25;
  opacity: 0.92;
}

.hero-copy {
  position: relative;
  z-index: 2;
  margin-top: 0.95rem;
  max-width: 22rem;
}

.tag {
  margin: 0;
  color: var(--text);
  font-weight: 650;
  font-size: 0.98rem;
  line-height: 1.4;
}

.place {
  margin: 0.45rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.org {
  margin: 0.75rem 0 0;
  display: inline-flex;
  color: var(--secondary);
  border: 1px solid color-mix(in srgb, var(--secondary) 40%, transparent);
  background: color-mix(in srgb, var(--secondary) 12%, transparent);
  border-radius: 999px;
  padding: 0.32rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 800;
}

.hero-photo {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  width: clamp(7.5rem, 34vw, 10.5rem);
  aspect-ratio: 1;
  border-radius: 46% 54% 48% 52% / 52% 44% 56% 48%;
  overflow: hidden;
  border: 1.5px solid color-mix(in srgb, var(--primary) 78%, white);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent),
    0 18px 40px rgba(0, 0, 0, 0.38);
  animation: hero-float 7.5s ease-in-out infinite;
}

.hero-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 32% 22%;
  display: block;
  transform: scale(1.02);
}

.immersive .hero-block {
  padding: 0.15rem 0 0.2rem;
}

.panel {
  position: relative;
  z-index: 2;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  padding: 1.25rem 1.15rem 1.2rem;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(18, 34, 58, 0.78), rgba(7, 16, 32, 0.88));
  border-color: color-mix(in srgb, var(--primary) 22%, rgba(255, 255, 255, 0.12));
  animation: panel-rise 0.55s ease-out both;
}

@keyframes hero-float {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-6px) rotate(1deg); }
}

@keyframes panel-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (min-width: 920px) {
  .guest {
    padding:
      max(2rem, env(safe-area-inset-top, 0px))
      max(2rem, env(safe-area-inset-right, 0px))
      max(2rem, env(safe-area-inset-bottom, 0px))
      max(2rem, env(safe-area-inset-left, 0px));
  }

  .guest:not(.immersive) {
    grid-template-columns: 1fr min(32rem, 46vw);
    justify-content: center;
    align-items: center;
    gap: 2rem;
  }

  .immersive {
    grid-template-columns: 1.05fr 0.95fr;
    align-items: center;
    gap: 1.75rem;
  }

  .immersive .hero-block {
    min-height: calc(100dvh - 4rem);
    display: grid;
    align-content: center;
    padding: 1.2rem 0;
  }

  .immersive .hero-top {
    align-items: center;
    gap: 1.5rem;
  }

  .immersive .wordmark {
    max-width: 24rem;
  }

  .immersive .wordmark h1 { font-size: 3.15rem; }
  .immersive .product { font-size: 0.98rem; }

  .immersive .hero-photo {
    width: clamp(12rem, 22vw, 16.5rem);
  }

  .immersive .hero-copy {
    max-width: 26rem;
    margin-top: 1.35rem;
  }

  .immersive .tag { font-size: 1.15rem; }

  .immersive .panel {
    align-self: center;
    max-width: 28rem;
    justify-self: end;
    width: 100%;
    padding: 1.65rem 1.5rem 1.45rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-photo,
  .panel { animation: none; }
}
</style>
