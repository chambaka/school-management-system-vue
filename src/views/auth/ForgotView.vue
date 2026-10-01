<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import Icon from "../../components/Icon.vue";
import { authApi } from "../../api/endpoints";
import { useFeedback } from "../../composables/useFeedback";


const router = useRouter();
const identifier = ref("");
const { error } = useFeedback();
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const res = await authApi.forgot({ identifier: identifier.value });
    sessionStorage.setItem("shulehub.resetIdentifier", identifier.value);
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
    <p class="sub">If that account exists, we text a 6-digit code to the phone on the account. It expires in 30 minutes.</p>
    <form data-no-confirm @submit.prevent="submit">
      <label class="field">
        <span>Email, phone, or username</span>
        <div class="control">
          <Icon class="lead" name="mail" />
          <input v-model="identifier" type="text" required autocomplete="username" autofocus placeholder="0753493500 or you@school.ac.tz" />
        </div>
      </label>
      <button class="btn" :disabled="loading">{{ loading ? "Sending…" : "Send SMS code" }}</button>
    </form>
    <p class="auth-back"><router-link to="/login">← Back to sign in</router-link></p>
  </GuestShell>
</template>

<style scoped>
h2 { margin: 0 0 0.15rem; font-size: 2rem; }
.btn { width: 100%; }
</style>
