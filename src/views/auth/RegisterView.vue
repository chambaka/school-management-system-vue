<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import Icon from "../../components/Icon.vue";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import { useAuthStore, homeFor } from "../../stores/auth";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const router = useRouter();
const { error } = useFeedback();
const loading = ref(false);
const passwordOk = ref(false);
const showConfirm = ref(false);
const confirmPassword = ref("");
const form = reactive({
  tenantName: "",
  adminName: "",
  adminEmail: "",
  password: "",
  phone: "",
  timezone: "Africa/Dar_es_Salaam",
  currency: "TZS",
  country: "Tanzania",
});

const passwordsMatch = computed(
  () => confirmPassword.value.length > 0 && confirmPassword.value === form.password,
);
const canSubmit = computed(() => passwordOk.value && passwordsMatch.value);

async function submit() {
  error.value = "";
  if (!passwordOk.value) {
    error.value = "Password does not meet requirements";
    return;
  }
  if (!passwordsMatch.value) {
    error.value = "Passwords do not match";
    return;
  }
  loading.value = true;
  try {
    const { tenantName, adminName, adminEmail, password, phone, timezone, currency, country } = form;
    const user = await auth.register({
      tenantName,
      adminName,
      adminEmail,
      password,
      phone,
      timezone,
      currency,
      country,
    });
    router.push(homeFor(user.role));
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <GuestShell>
    <h2 class="serif">Register organization</h2>
    <p class="sub">Creates the organization and your tenant admin. A platform admin can add schools afterward.</p>
    <form data-confirm="Create this organization?" @submit.prevent="submit">
      <label class="field">
        <span>Organization / tenant</span>
        <div class="control">
          <Icon class="lead" name="users" />
          <input v-model="form.tenantName" required placeholder="Chambaka Education Group" />
        </div>
      </label>
      <label class="field">
        <span>Admin name</span>
        <div class="control">
          <Icon class="lead" name="user" />
          <input v-model="form.adminName" required />
        </div>
      </label>
      <label class="field">
        <span>Admin email</span>
        <div class="control">
          <Icon class="lead" name="mail" />
          <input v-model="form.adminEmail" type="email" required />
        </div>
      </label>
      <PasswordStrengthInput
        v-model="form.password"
        :email="form.adminEmail"
        :name="form.adminName"
        @valid-change="passwordOk = $event"
      />
      <label class="field">
        <span>Confirm password</span>
        <div class="control">
          <Icon class="lead" name="lock" />
          <input
            v-model="confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            required
            autocomplete="new-password"
            placeholder="Re-enter password"
          />
          <button class="trail" type="button" @click="showConfirm = !showConfirm"><Icon name="eye" /></button>
        </div>
        <p v-if="confirmPassword" class="match" :class="{ ok: passwordsMatch, fail: !passwordsMatch }">
          {{ passwordsMatch ? "Passwords match" : "Passwords do not match" }}
        </p>
      </label>
      <div class="grid grid-2">
        <PhoneInput v-model="form.phone" />
        <label class="field"><span>Currency</span><input v-model="form.currency" /></label>
        <label class="field"><span>Timezone</span><input v-model="form.timezone" /></label>
        <label class="field"><span>Country</span><input v-model="form.country" /></label>
      </div>
      <button class="btn" :disabled="loading || !canSubmit">{{ loading ? "Creating…" : "Create organization" }}</button>
    </form>
    <p class="auth-back"><router-link to="/login">← Back to sign in</router-link></p>
  </GuestShell>
</template>

<style scoped>
h2 { margin: 0 0 0.15rem; font-size: 2rem; }
.btn { width: 100%; }
.match { margin: 0.35rem 0 0; font-size: 0.76rem; font-weight: 700; }
.match.ok { color: var(--ok); }
.match.fail { color: var(--danger); }
</style>
