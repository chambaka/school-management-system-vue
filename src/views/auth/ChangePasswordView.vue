<script setup>
import { ref } from "vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import { authApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const currentPassword = ref("");
const newPassword = ref("");
const passwordOk = ref(false);
const error = ref("");
const ok = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  ok.value = "";
  loading.value = true;
  try {
    await authApi.changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value });
    ok.value = "Password updated. Other sessions were signed out.";
    currentPassword.value = "";
    newPassword.value = "";
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Security</h1>
        <p class="sub">Change the password for {{ auth.user?.email }}</p>
      </div>
    </div>
    <div class="glass card" style="max-width: 520px">
      <p v-if="error" class="banner banner-error">{{ error }}</p>
      <p v-if="ok" class="banner banner-ok">{{ ok }}</p>
      <form data-confirm="Change your password?" @submit.prevent="submit">
        <label class="field">
          <span>Current password</span>
          <input v-model="currentPassword" type="password" required />
        </label>
        <PasswordStrengthInput
          v-model="newPassword"
          :email="auth.user?.email"
          :name="auth.user?.name"
          label="New password"
          @valid-change="passwordOk = $event"
        />
        <button class="btn" :disabled="loading || !passwordOk">Update password</button>
      </form>
    </div>
  </section>
</template>
