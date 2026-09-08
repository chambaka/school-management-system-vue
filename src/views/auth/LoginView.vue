<script setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import Icon from "../../components/Icon.vue";
import { useAuthStore, homeFor } from "../../stores/auth";
import { useConfigStore } from "../../stores/config";

const auth = useAuthStore();
const config = useConfigStore();
const router = useRouter();
const route = useRoute();
const error = ref("");
const loading = ref(false);
const show = ref(false);
const form = reactive({ email: "", password: "" });

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const user = await auth.login(form);
    await config.bootstrap();
    const next = typeof route.query.next === "string" ? route.query.next : "";
    router.push(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
  } catch (e) {
    error.value = e.message || "Invalid email or password";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <GuestShell>
    <h2 class="serif">Sign in</h2>
    <p class="sub">Use your school email. Forgot? We send a 6-digit code.</p>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <form data-no-confirm @submit.prevent="submit">
      <label class="field">
        <span>Email</span>
        <div class="control">
          <Icon class="lead" name="mail" />
          <input v-model="form.email" type="email" required autocomplete="username" placeholder="yuki.t@example.com" />
        </div>
      </label>
      <label class="field">
        <div class="field-head">
          <span>Password</span>
          <router-link class="forgot" to="/forgot">Forgot password</router-link>
        </div>
        <div class="control">
          <Icon class="lead" name="lock" />
          <input v-model="form.password" :type="show ? 'text' : 'password'" required autocomplete="current-password" />
          <button class="trail" type="button" @click="show = !show"><Icon name="eye" /></button>
        </div>
      </label>
      <button class="btn" :disabled="loading">
        {{ loading ? "Signing in…" : "Login" }}
        <Icon name="arrow" />
      </button>
    </form>
    <template v-if="config.registrationEnabled">
      <p class="auth-or">or</p>
      <router-link class="btn btn-ghost register" to="/register">
        <Icon name="school" />
        Register organization
      </router-link>
    </template>
  </GuestShell>
</template>

<style scoped>
h2 { margin: 0 0 0.15rem; font-size: 2rem; }
.btn { width: 100%; margin-top: 0.45rem; }
.register { width: 100%; }
.forgot {
  display: inline-flex;
  align-items: center;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 42%, transparent);
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 0 18px color-mix(in srgb, var(--primary) 22%, transparent);
}
.forgot:hover {
  color: #1a1203;
  background: linear-gradient(135deg, #ffe08a, var(--primary));
}
</style>
