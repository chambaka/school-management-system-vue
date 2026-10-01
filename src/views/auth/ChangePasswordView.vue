<script setup>
import { computed, onMounted, ref } from "vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import { authApi, notificationSettingsApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const canResetOwnTwoFactor = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACADEMIC_MASTER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"].includes(auth.role));
const currentPassword = ref("");
const newPassword = ref("");
const passwordOk = ref(false);
const { error, ok } = useFeedback();
const loading = ref(false);
const resetting2fa = ref(false);
const channel = ref("");
const savingChannel = ref(false);

onMounted(async () => {
  try {
    const prefs = await notificationSettingsApi.preferences();
    const chosen = (prefs || []).find((row) => row.eventKey === "ALL");
    if (chosen?.sms && !chosen?.inApp) channel.value = "SMS";
    else if (chosen?.inApp && !chosen?.sms) channel.value = "IN_APP";
  } catch {
    channel.value = "";
  }
});

async function choose(next) {
  if (savingChannel.value || channel.value === next) return;
  const previous = channel.value;
  channel.value = next;
  savingChannel.value = true;
  error.value = "";
  ok.value = "";
  try {
    await notificationSettingsApi.savePreference({
      eventKey: "ALL",
      inApp: next === "IN_APP",
      email: false,
      sms: next === "SMS",
      push: false,
    });
    ok.value = next === "SMS" ? "Notifications will be sent by SMS." : "Notifications will stay in the app.";
  } catch (e) {
    channel.value = previous;
    error.value = e.message;
  } finally {
    savingChannel.value = false;
  }
}

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

async function resetOwnTwoFactor() {
  error.value = "";
  ok.value = "";
  resetting2fa.value = true;
  try {
    await authApi.resetTwoFactor();
    if (auth.user) auth.persist({ ...auth.user, totpEnabled: false });
    ok.value = "Authenticator enrollment cleared. Next sign-in will show a new ShuleHub 2FA setup key.";
  } catch (e) {
    error.value = e.message;
  } finally {
    resetting2fa.value = false;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Security</h1>
        <p class="sub">Password and authenticator for {{ auth.user?.email }}</p>
      </div>
    </div>
    <div class="glass card" style="max-width: 520px">
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
    <div v-if="canResetOwnTwoFactor && auth.user?.totpEnabled" class="glass card" style="max-width: 520px; margin-top: 1rem">
      <h3>ShuleHub 2FA</h3>
      <p class="sub">Google Authenticator is enrolled on this account. Only a headmaster or school admin can reset 2FA. The next sign-in will show a new setup key.</p>
      <button
        class="btn btn-ghost"
        type="button"
        :disabled="resetting2fa"
        v-confirm="{ message: 'Clear your authenticator enrollment? You will set up Google Authenticator again at next sign-in.', danger: true }"
        @click="resetOwnTwoFactor"
      >Reset 2FA</button>
    </div>
    <article class="glass card channels" style="max-width: 520px; margin-top: 1rem">
      <h3>Notification channels</h3>
      <p class="sub">Choose in-app or SMS. Email and push are not used.</p>
      <div class="row-actions">
        <button
          class="btn"
          :class="{ 'btn-ghost': channel !== 'IN_APP' }"
          type="button"
          :aria-pressed="channel === 'IN_APP'"
          :disabled="savingChannel"
          @click="choose('IN_APP')"
        >In-app</button>
        <button
          class="btn"
          :class="{ 'btn-ghost': channel !== 'SMS' }"
          type="button"
          :aria-pressed="channel === 'SMS'"
          :disabled="savingChannel"
          @click="choose('SMS')"
        >SMS</button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.channels { margin-top: 1rem; }
.channels .btn { min-height: 2.75rem; }
</style>
