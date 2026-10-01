<script setup>
defineProps({
  column: { type: String, required: true },
  label: { type: String, required: true },
  active: { type: String, required: true },
  dir: { type: String, required: true },
  bare: { type: Boolean, default: false },
});
defineEmits(["toggle"]);
</script>

<template>
  <component
    :is="bare ? 'div' : 'th'"
    :aria-sort="active === column ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'"
  >
    <button type="button" class="th-sort" @click="$emit('toggle', column)">
      <span>{{ label }}</span>
      <span v-if="active === column" class="th-sort-ind" aria-hidden="true">{{ dir === "desc" ? "↓" : "↑" }}</span>
    </button>
  </component>
</template>
