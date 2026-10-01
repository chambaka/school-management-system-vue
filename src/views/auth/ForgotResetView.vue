<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import { authApi } from "../../api/endpoints";
import { useFeedback } from "../../composables/useFeedback";


const router = useRouter();
const password = ref("");
const passwordOk = ref(false);
const { error } = useFeedback();
const loading = ref(false);
const email = ref("");

onMounted(() => {
  email.value = sessionStorage.getItem("shulehub.resetIdentifier")
    || sessionStorage.getItem("shulehub.resetEmail")
    || "";
  if (!sessionStorage.getItem("shulehub.resetToken")) router.replace("/forgot");
});

async function submit() {
  error.value = "";
  if (!passwordOk.value) {
    error.value = "Password does not meet requirements";
    return;
  }
  loading.value = true;
  try {
    await authApi.reset({
      resetToken: sessionStorage.getItem("shulehub.resetToken"),
      newPassword: password.value,
    });
    sessionStorage.removeItem("shulehub.resetToken");
    sessionStorage.removeItem("shulehub.resetMeta");
    router.push("/login");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <GuestShell>
    <h2 class="serif">Choose a new password</h2>
    <p class="sub">This signs you out of other devices.</p>
    <form data-no-confirm @submit.prevent="submit">
      <PasswordStrengthInput v-model="password" :email="email" @valid-change="passwordOk = $event" />
      <button class="btn" :disabled="loading || !passwordOk">{{ loading ? "Updating…" : "Update password & sign in" }}</button>
    </form>
  </GuestShell>
</template>

<style scoped>
h2 { margin: 0 0 0.15rem; font-size: 2rem; }
.btn { width: 100%; }
</style>
