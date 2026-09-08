<script setup>
import { computed } from "vue";
import { localPhone, persistPhone } from "../utils/phone";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "Phone" },
  required: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const display = computed(() => localPhone(props.modelValue));

function onInput(event) {
  emit("update:modelValue", persistPhone(event.target.value));
}
</script>

<template>
  <label class="field">
    <span>{{ label }}</span>
    <div class="control phone">
      <span class="lead">255</span>
      <input
        type="tel"
        inputmode="numeric"
        autocomplete="tel"
        :required="required"
        :value="display"
        placeholder="753493500 or 0753493500"
        @input="onInput"
      />
    </div>
  </label>
</template>
