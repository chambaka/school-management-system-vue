<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import Icon from "../../components/Icon.vue";
import { authApi } from "../../api/endpoints";
import { useFeedback } from "../../composables/useFeedback";


const router = useRouter();
const identifier = ref("");
const meta = ref({});
const digits = ref(["", "", "", "", "", ""]);
const { error, info } = useFeedback();
const loading = ref(false);

const code = computed(() => digits.value.join(""));

onMounted(() => {
  identifier.value = sessionStorage.getItem("shulehub.resetIdentifier")
    || sessionStorage.getItem("shulehub.resetEmail")
    || "";
  try {
    meta.value = JSON.parse(sessionStorage.getItem("shulehub.resetMeta") || "{}");
  } catch {
    meta.value = {};
  }
  if (!identifier.value) router.replace("/forgot");
  if (meta.value.debugCode) {
    info.value = `Dev code: ${meta.value.debugCode}`;
  }
});

function onDigit(index, event) {
  const value = event.target.value.replace(/\D/g, "").slice(-1);
  digits.value[index] = value;
  if (value && event.target.nextElementSibling) event.target.nextElementSibling.focus();
}

function clearResetSession() {
  sessionStorage.removeItem("shulehub.resetIdentifier");
  sessionStorage.removeItem("shulehub.resetEmail");
  sessionStorage.removeItem("shulehub.resetMeta");
  sessionStorage.removeItem("shulehub.resetToken");
}

function useDifferentAccount() {
  clearResetSession();
}

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const res = await authApi.verifyCode({ identifier: identifier.value, code: code.value });
    sessionStorage.setItem("shulehub.resetToken", res.resetToken);
    router.push("/forgot/reset");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <GuestShell>
    <div class="code-page">
      <h2 class="serif">Check your phone</h2>
      <p class="sub dest">
        Enter the 6-digit code we texted
        <b v-if="meta.maskedPhone || meta.maskedEmail">{{ meta.maskedPhone || meta.maskedEmail }}</b>.
      </p>
      <form data-no-confirm @submit.prevent="submit">
        <div class="otp">
          <input
            v-for="(_, i) in digits"
            :key="i"
            :value="digits[i]"
            maxlength="1"
            inputmode="numeric"
            autocomplete="one-time-code"
            :aria-label="`Digit ${i + 1}`"
            @input="onDigit(i, $event)"
          />
        </div>
        <button class="btn" :disabled="loading || code.length !== 6">{{ loading ? "Verifying…" : "Verify code" }}</button>
      </form>
      <a class="switch-id" href="/forgot" @click="useDifferentAccount">
        <Icon name="arrow" />
        Use a different number or email
      </a>
    </div>
  </GuestShell>
</template>

<style scoped>
.code-page { min-width: 0; max-width: 100%; }
h2 { margin: 0; font-size: 1.35rem; }
.dest {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.dest b { color: var(--primary); font-weight: 800; }
.debug { margin: 0.55rem 0 0; padding: 0.45rem 0.65rem; font-size: 0.8rem; }
.otp {
  display: flex;
  gap: 0.28rem;
  margin: 0.7rem 0 0.8rem;
  width: 100%;
  min-width: 0;
}
.otp input {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
  height: 2.5rem;
  padding: 0;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 800;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
  background: rgba(4,10,22,.45);
  color: var(--primary);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}
.btn { width: 100%; padding: 0.7rem 1rem; }
.switch-id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.85rem;
  padding: 0.62rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--primary) 42%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  text-decoration: none;
  position: relative;
  z-index: 3;
  pointer-events: auto;
  box-shadow: 0 0 18px color-mix(in srgb, var(--primary) 22%, transparent);
}
.switch-id :deep(.ico) {
  width: 0.95rem;
  height: 0.95rem;
  transform: rotate(180deg);
  pointer-events: none;
}
.switch-id:hover {
  color: #1a1203;
  background: linear-gradient(135deg, #ffe08a, var(--primary));
  border-color: transparent;
}
.switch-id:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}
</style>
