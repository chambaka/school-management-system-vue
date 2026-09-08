<script setup>
import { onMounted } from "vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import { useBrandingStore } from "./stores/branding";

const branding = useBrandingStore();
onMounted(() => branding.bootstrap());
</script>

<template>
  <router-view />
  <ConfirmDialog />
</template>
