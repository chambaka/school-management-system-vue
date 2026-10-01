<script setup>
import { onMounted } from "vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import IdleSessionGuard from "./components/IdleSessionGuard.vue";
import NoticeDialog from "./components/NoticeDialog.vue";
import { useBrandingStore } from "./stores/branding";

const branding = useBrandingStore();
onMounted(() => branding.bootstrap());
</script>

<template>
  <router-view />
  <IdleSessionGuard />
  <ConfirmDialog />
  <NoticeDialog />
</template>
