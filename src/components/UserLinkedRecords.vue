<script setup>
import { ref, watch } from "vue";
import { peopleApi } from "../api/endpoints";
import Icon from "./Icon.vue";

const props = defineProps({
  userId: { type: [Number, String], required: true },
  schoolId: { type: [Number, String], default: undefined },
  readonly: { type: Boolean, default: false },
});
const emit = defineEmits(["changed"]);

const links = ref([]);
const error = ref("");
const loading = ref(false);

async function loadLinks() {
  if (props.userId == null || props.userId === "") return;
  loading.value = true;
  error.value = "";
  try {
    const data = await peopleApi.userLinks(props.userId, props.schoolId);
    links.value = data.links || [];
  } catch (e) {
    links.value = [];
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

watch(() => props.userId, loadLinks, { immediate: true });

function confirmMessage(item) {
  if (item.unlinkKind === "ALLOCATION") {
    return `Remove the ${item.title} allocation${item.detail ? ` (${item.detail})` : ""}?`;
  }
  return `Unlink ${item.title} from this login?`;
}

async function removeLink(item) {
  error.value = "";
  try {
    await peopleApi.removeUserLink(props.userId, props.schoolId, {
      unlinkKind: item.unlinkKind,
      id: item.id,
      studentId: item.studentId,
      parentId: item.parentId,
    });
    await loadLinks();
    emit("changed");
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="linked" aria-label="Linked records">
    <h4>Linked records</h4>
    <p v-if="loading" class="sub">Loading…</p>
    <p v-else-if="error" class="sub">{{ error }}</p>
    <p v-else-if="!links.length" class="sub">No teacher, student, parent, or other school records are linked to this login.</p>
    <ul v-else class="entity-list">
      <li v-for="(item, index) in links" :key="`${item.type}-${item.id || index}`" class="entity-item">
        <div>
          <strong>{{ item.title }}</strong>
          <span class="sub">{{ [item.type, item.detail].filter(Boolean).join(" · ") }}</span>
        </div>
        <button
          v-if="!readonly && item.removable"
          class="icon-btn"
          type="button"
          :aria-label="`Remove ${item.title}`"
          title="Remove link"
          v-confirm="{ message: confirmMessage(item), confirmLabel: 'Remove', danger: true }"
          @click="removeLink(item)"
        >
          <Icon name="trash" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.linked {
  display: grid;
  gap: 0.55rem;
  margin: 0.85rem 0 0;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}
.linked h4 {
  margin: 0;
  font-size: 0.95rem;
}
.entity-item { margin: 0; }
</style>
