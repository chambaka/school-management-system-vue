<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore, homeFor } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();
onMounted(() => router.replace(homeFor(auth.role)));
</script>

<template>
  <p class="page">Opening your school…</p>
</template>
