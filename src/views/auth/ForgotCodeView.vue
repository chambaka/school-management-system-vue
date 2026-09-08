<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import { authApi } from "../../api/endpoints";

const router = useRouter();
const email = ref("");
const meta = ref({});
const digits = ref(["", "", "", "", "", ""]);
const error = ref("");
const loading = ref(false);

const code = computed(() => digits.value.join(""));

onMounted(() => {
  email.value = sessionStorage.getItem("shulehub.resetEmail") || "";
  try {
    meta.value = JSON.parse(sessionStorage.getItem("shulehub.resetMeta") || "{}");
  } catch {
    meta.value = {};
  }
  if (!email.value) router.replace("/forgot");
});

function onDigit(index, event) {
  const value = event.target.value.replace(/\D/g, "").slice(-1);
  digits.value[index] = value;
  if (value && event.target.nextElementSibling) event.target.nextElementSibling.focus();
}

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const res = await authApi.verifyCode({ email: email.value, code: code.value });
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
    <h2 class="serif">Check your email</h2>
    <p class="sub">{{ meta.message || "We sent a reset code." }} {{ meta.maskedEmail }}</p>
    <p v-if="meta.debugCode" class="banner banner-ok">Dev code: {{ meta.debugCode }}</p>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form data-no-confirm @submit.prevent="submit">
      <div class="otp">
        <input
          v-for="(_, i) in digits"
          :key="i"
          :value="digits[i]"
          maxlength="1"
          inputmode="numeric"
          @input="onDigit(i, $event)"
        />
      </div>
      <button class="btn" :disabled="loading || code.length !== 6">{{ loading ? "Verifying…" : "Verify code" }}</button>
    </form>
    <p class="auth-back"><router-link to="/forgot">← Use a different email</router-link></p>
  </GuestShell>
</template>

<style scoped>
h2 { margin: 0 0 0.15rem; font-size: 2rem; }
.otp { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.45rem; margin: 1.15rem 0; }
.otp input {
  text-align: center; font-size: 1.45rem; font-weight: 800;
  padding: 0.85rem 0; border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
  background: rgba(4,10,22,.45); color: var(--primary);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}
.btn { width: 100%; }
</style>
