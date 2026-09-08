<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import Icon from "../../components/Icon.vue";
import { authApi } from "../../api/endpoints";

const router = useRouter();
const email = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const res = await authApi.forgot({ email: email.value });
    sessionStorage.setItem("shulehub.resetEmail", email.value);
    sessionStorage.setItem("shulehub.resetMeta", JSON.stringify(res));
    router.push("/forgot/code");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <GuestShell>
    <h2 class="serif">Forgot password</h2>
    <p class="sub">If that account exists, we send a 6-digit code. It expires in 30 minutes.</p>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form data-no-confirm @submit.prevent="submit">
      <label class="field">
        <span>Email</span>
        <div class="control">
          <Icon class="lead" name="mail" />
          <input v-model="email" type="email" required placeholder="yuki.t@example.com" />
        </div>
      </label>
      <button class="btn" :disabled="loading">{{ loading ? "Sending…" : "Send reset code" }}</button>
    </form>
    <p class="auth-back"><router-link to="/login">← Back to sign in</router-link></p>
  </GuestShell>
</template>

<style scoped>
h2 { margin: 0 0 0.15rem; font-size: 2rem; }
.btn { width: 100%; }
</style>
