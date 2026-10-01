<script setup>
import { useRoute } from "vue-router";
import { accountantFinanceMenu } from "../utils/financeNav";

defineProps({
  variant: { type: String, default: "side" },
});

const route = useRoute();

function groupActive(group) {
  if (group.to) return route.path === group.to;
  return Boolean(group.children?.some((child) => route.path === child.to));
}
</script>

<template>
  <nav class="fin-nav" :class="variant">
    <div v-for="group in accountantFinanceMenu" :key="group.label" class="group">
      <router-link
        v-if="group.to && !group.children"
        :to="group.to"
        class="leaf top"
        :class="{ active: route.path === group.to }"
      >
        {{ group.label }}
      </router-link>
      <template v-else>
        <p class="group-label" :class="{ current: groupActive(group) }">{{ group.label }}</p>
        <router-link
          v-for="child in group.children"
          :key="child.to"
          :to="child.to"
          class="leaf"
          :class="{ active: route.path === child.to }"
        >
          {{ child.label }}
        </router-link>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.fin-nav { display: grid; gap: 0.35rem; }
.group { display: grid; gap: 0.35rem; }
.group-label {
  margin: 0;
  padding: 0.28rem 0.55rem 0.08rem;
  color: var(--primary);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.group-label.current { color: var(--primary); }
.leaf {
  position: relative;
  color: #f5c451;
  padding: 0.48rem 0.7rem 0.48rem 1.15rem;
  border-radius: 12px;
  border: 0;
  font-weight: 800;
  font-size: 0.84rem;
  letter-spacing: 0.04em;
  line-height: 1.25;
  text-decoration: none;
  background: none;
  box-shadow: none;
  text-shadow:
    0 1px 0 #fff6d2,
    0 2px 0 #a97812,
    0 4px 8px rgba(0, 0, 0, 0.45);
}
.leaf::before {
  content: "";
  position: absolute;
  left: 0.45rem;
  top: 50%;
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  transform: translateY(-50%);
  background: #f5c451;
  box-shadow: 0 1px 0 #fff6d2;
}
.leaf.top {
  padding-left: 0.7rem;
  font-size: 0.88rem;
}
.leaf.top::before { display: none; }
.leaf.active {
  background: none;
  color: #fff4c8;
  box-shadow: none;
  text-shadow:
    0 1px 0 #fff,
    0 0 14px rgba(255, 224, 138, 0.85);
}
.leaf.active::before { background: #fff4c8; }
.side .group {
  background: color-mix(in srgb, var(--ink) 42%, transparent);
  border-radius: 14px;
  padding: 0.28rem 0.28rem 0.35rem;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 18%, transparent);
}
.panel {
  display: grid;
  gap: 0.65rem;
  margin-bottom: 1rem;
}
.panel .group {
  background: color-mix(in srgb, var(--ink-2) 70%, transparent);
  border-radius: 16px;
  padding: 0.4rem 0.4rem 0.5rem;
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.28),
    inset 0 0 0 1px color-mix(in srgb, var(--primary) 28%, transparent);
}
.panel .group-label { margin-top: 0.1rem; }
</style>
