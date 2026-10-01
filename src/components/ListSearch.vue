<script setup>
import Icon from "./Icon.vue";

defineProps({
  placeholder: { type: String, default: "Search" },
});

const query = defineModel({ type: String, default: "" });
</script>

<template>
  <label class="list-search">
    <Icon name="search" />
    <input v-model="query" type="search" :placeholder="placeholder" :aria-label="placeholder" />
  </label>
</template>
