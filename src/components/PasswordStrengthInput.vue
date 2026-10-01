<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Icon from "./Icon.vue";
import { evaluatePassword, generateCompliantPassword } from "../utils/passwordPolicy";
import { useNoticeStore } from "../stores/notice";

const props = defineProps({
  modelValue: { type: String, default: "" },
  email: { type: String, default: "" },
  name: { type: String, default: "" },
  label: { type: String, default: "Password" },
  hint: { type: String, default: "" },
  inputId: { type: String, default: "password-input" },
});
const emit = defineEmits(["update:modelValue", "valid-change"]);

const rootRef = ref(null);
const rulesOpen = ref(false);
const revealed = ref(false);
const notice = useNoticeStore();

const evaluation = computed(() =>
  evaluatePassword(props.modelValue, { email: props.email, name: props.name }),
);
const strengthClass = computed(() => {
  const level = evaluation.value.strength;
  if (level <= 1) return "weak";
  if (level === 2) return "fair";
  if (level === 3) return "good";
  return "strong";
});

watch(evaluation, (value) => emit("valid-change", value.valid), { immediate: true });

function onDocClick(event) {
  if (rulesOpen.value && !rootRef.value?.contains(event.target)) rulesOpen.value = false;
}

onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));

function generatePassword() {
  try {
    const password = generateCompliantPassword({ email: props.email, name: props.name });
    revealed.value = true;
    emit("update:modelValue", password);
  } catch (e) {
    notice.error(e.message);
  }
}
</script>

<template>
  <div ref="rootRef" class="psf">
    <label class="field" :for="inputId">
      <div class="label-row">
        <span>{{ label }}</span>
        <div class="label-actions">
          <button type="button" class="pw-action generate" @click.stop="generatePassword">
            <Icon name="shield" />
            Generate password
          </button>
          <button type="button" class="pw-action rules" :class="{ on: rulesOpen }" @click.stop="rulesOpen = !rulesOpen">
            <Icon name="list" />
            Password rules
          </button>
        </div>
      </div>
      <div class="control">
        <Icon class="lead" name="lock" />
        <input
          :id="inputId"
          :type="revealed ? 'text' : 'password'"
          :value="modelValue"
          autocomplete="new-password"
          @input="emit('update:modelValue', $event.target.value)"
        />
        <button class="trail" type="button" @click="revealed = !revealed"><Icon name="eye" /></button>
      </div>
    </label>
    <p v-if="hint && !modelValue" class="sub hint-copy">{{ hint }}</p>
    <div v-if="modelValue" class="strength" :class="strengthClass">
      <div class="strength-head">
        <span>Password strength</span>
        <b>{{ evaluation.strengthLabel }}</b>
      </div>
      <div class="bar"><i :style="{ width: `${evaluation.strengthPercent}%` }" /></div>
      <p v-if="!evaluation.valid" class="hint">
        {{ evaluation.metCount }} of {{ evaluation.totalRules }} rules met —
        <button type="button" class="pw-action mini" @click.stop="rulesOpen = true">view rules</button>
      </p>
      <p v-if="!evaluation.valid" class="fail">{{ evaluation.firstError }}</p>
      <p v-else class="ok">Password meets all requirements · Strong password — ready to use</p>
    </div>
    <div v-if="rulesOpen" class="popover glass card">
      <p class="req-title">Your password must:</p>
      <ul>
        <li v-for="rule in evaluation.rules" :key="rule.id" :class="{ met: rule.met }">
          {{ rule.met ? "✓" : "○" }} {{ rule.label }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.psf { position: relative; }
.label-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}
.label-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.pw-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.32rem 0.72rem;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  text-transform: none;
}
.pw-action :deep(.ico) { width: 0.92rem; height: 0.92rem; }
.pw-action.generate {
  color: #1a1203;
  background: linear-gradient(135deg, #ffe08a, var(--primary) 52%, #d7a227);
  border: 0;
  box-shadow: 0 0 22px color-mix(in srgb, var(--primary) 38%, transparent);
}
.pw-action.generate:hover { filter: brightness(1.06); }
.pw-action.rules {
  color: var(--secondary);
  background: color-mix(in srgb, var(--secondary) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--secondary) 48%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--secondary) 22%, transparent);
}
.pw-action.rules:hover,
.pw-action.rules.on {
  color: #04221c;
  background: linear-gradient(135deg, #7ef0dd, var(--secondary));
  border-color: transparent;
}
.pw-action.mini {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 42%, transparent);
  padding: 0.16rem 0.55rem;
  font-size: 0.7rem;
  vertical-align: 0.08rem;
}
.control .lead { font-size: 0.95rem; }
.hint-copy { margin: 0.35rem 0 0.2rem; font-size: 0.78rem; }
.strength {
  margin: 0.45rem 0 0.85rem;
  padding: 0.8rem 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(4,10,22,.28);
}
.strength-head { display: flex; justify-content: space-between; font-size: 0.8rem; }
.bar { height: 0.45rem; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden; margin: 0.4rem 0; }
.bar i { display: block; height: 100%; background: var(--danger); }
.strength.fair .bar i { background: var(--fair); }
.strength.good .bar i, .strength.strong .bar i { background: var(--ok); }
.hint, .fail, .ok { margin: 0.25rem 0 0; font-size: 0.76rem; }
.fail { color: var(--danger); }
.ok { color: var(--ok); }
.popover { position: absolute; inset: auto 0 auto 0; top: calc(100% + 0.3rem); z-index: 8; }
.req-title { margin: 0 0 0.4rem; font-weight: 800; font-size: 0.8rem; }
ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.25rem; }
li { font-size: 0.75rem; color: var(--muted); }
li.met { color: var(--ok); }
</style>
