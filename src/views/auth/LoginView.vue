<script setup>
import { computed, reactive, ref, watch } from "vue";
import QRCode from "qrcode";
import { useRoute, useRouter } from "vue-router";
import GuestShell from "../../layouts/GuestShell.vue";
import Icon from "../../components/Icon.vue";
import { useAuthStore, homeFor } from "../../stores/auth";
import { useConfigStore } from "../../stores/config";
import { useFeedback } from "../../composables/useFeedback";


const auth = useAuthStore();
const config = useConfigStore();
const router = useRouter();
const route = useRoute();
const { error } = useFeedback();
const loading = ref(false);
const show = ref(false);
const copied = ref(false);
const qrSrc = ref("");
const form = reactive({ identifier: "", password: "" });
const challenge = ref(null);
const digits = ref(["", "", "", "", "", ""]);

const code = computed(() => digits.value.join(""));
const groupedSecret = computed(() => (challenge.value?.totpSecret || "").replace(/(.{4})/g, "$1 ").trim());
const idleNotice = computed(() => route.query.idle === "1");

watch(
  () => challenge.value?.otpauthUri,
  async (uri) => {
    qrSrc.value = "";
    if (!uri) return;
    try {
      qrSrc.value = await QRCode.toDataURL(uri, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
        color: { dark: "#06101F", light: "#ffffff" },
      });
    } catch {
      qrSrc.value = "";
    }
  },
);

async function finish(user) {
  await config.bootstrap();
  const next = typeof route.query.next === "string" ? route.query.next : "";
  router.push(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const response = await auth.login(form);
    if (response.twoFactorRequired) {
      challenge.value = response;
      digits.value = ["", "", "", "", "", ""];
      return;
    }
    await finish(response.user);
  } catch (e) {
    error.value = e.status === 401
      ? "Login or password is incorrect"
      : (e.message || "Login or password is incorrect");
  } finally {
    loading.value = false;
  }
}

async function submitCode() {
  error.value = "";
  loading.value = true;
  try {
    const response = await auth.verifyTwoFactor({
      pendingToken: challenge.value.pendingToken,
      code: code.value,
    });
    await finish(response.user);
  } catch (e) {
    error.value = e.message || "Invalid authenticator code";
    digits.value = ["", "", "", "", "", ""];
  } finally {
    loading.value = false;
  }
}

function onDigit(index, event) {
  const value = event.target.value.replace(/\D/g, "").slice(-1);
  digits.value[index] = value;
  if (value && event.target.nextElementSibling) event.target.nextElementSibling.focus();
}

function onPaste(event) {
  const text = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
  if (!text) return;
  event.preventDefault();
  digits.value = Array.from({ length: 6 }, (_, i) => text[i] || "");
}

function backToPassword() {
  challenge.value = null;
  error.value = "";
  digits.value = ["", "", "", "", "", ""];
}

async function copySecret() {
  const secret = challenge.value?.totpSecret;
  if (!secret) return;
  try {
    await navigator.clipboard.writeText(secret);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1600);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <GuestShell>
    <template v-if="!challenge">
      <h2 class="serif">Sign in</h2>
      <p v-if="idleNotice" class="session-idle">You were signed out due to inactivity. Sign in again to continue.</p>
      <p class="sub">Email, phone, or username. Five failed attempts lock the account for 15 minutes.</p>
      <form data-no-confirm @submit.prevent="submit">
        <label class="field">
          <span>Email, phone, or username</span>
          <div class="control">
            <Icon class="lead" name="mail" />
            <input v-model="form.identifier" type="text" required autocomplete="username" placeholder="you@school.ac.tz" />
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
    </template>

    <div v-else class="code-page">
      <h2 class="serif">ShuleHub 2FA</h2>
      <p class="sub dest">
        <template v-if="challenge.setupRequired">
          Open <b>Google Authenticator</b>, scan the QR code, then enter the 6-digit code.
        </template>
        <template v-else>
          Open <b>Google Authenticator</b> and enter the 6-digit code.
        </template>
      </p>
      <div v-if="challenge.setupRequired && (qrSrc || challenge.totpSecret)" class="setup glass">
        <template v-if="qrSrc">
          <p class="setup-label">Scan with Google Authenticator</p>
          <div class="qr-wrap">
            <img :src="qrSrc" width="220" height="220" alt="Google Authenticator QR code" />
          </div>
          <p class="hint">In the app tap Add account → Scan a QR code.</p>
        </template>
        <template v-if="challenge.totpSecret">
          <p class="setup-label key-label">{{ qrSrc ? "Can't scan? Setup key" : "Setup key" }}</p>
          <p class="secret">{{ groupedSecret }}</p>
          <p class="hint">Add account → Enter a setup key. Account: your email. Key type: Time based.</p>
          <button class="btn btn-ghost copy" type="button" @click="copySecret">
            {{ copied ? "Copied" : "Copy setup key" }}
          </button>
        </template>
      </div>
      <form data-no-confirm @submit.prevent="submitCode">
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
            @paste="onPaste"
          />
        </div>
        <button class="btn" :disabled="loading || code.length !== 6">
          {{ loading ? "Verifying…" : "Verify code" }}
        </button>
      </form>
      <button class="switch-id" type="button" @click="backToPassword">
        <Icon name="arrow" />
        Use a different account
      </button>
    </div>
  </GuestShell>
</template>

<style scoped>
h2 { margin: 0 0 0.15rem; font-size: 2rem; }
.session-idle {
  margin: 0.55rem 0 0.2rem;
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 38%, transparent);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.4;
}
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
.code-page { min-width: 0; max-width: 100%; }
.code-page h2 { margin: 0; font-size: 1.35rem; }
.dest {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  line-height: 1.35;
}
.dest b { color: var(--primary); font-weight: 800; }
.setup {
  margin: 0.8rem 0 0.4rem;
  padding: 0.85rem 0.9rem;
  border-radius: 14px;
}
.setup-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.key-label { margin-top: 0.85rem; }
.qr-wrap {
  display: flex;
  justify-content: center;
  margin: 0.65rem 0 0.15rem;
}
.qr-wrap img {
  display: block;
  width: 196px;
  height: 196px;
  padding: 10px;
  background: #fff;
  border-radius: 12px;
}
.secret {
  margin: 0.4rem 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--primary);
  overflow-wrap: anywhere;
}
.hint {
  margin: 0.45rem 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.4;
}
.copy { margin-top: 0.7rem; width: auto; }
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
}
.switch-id :deep(.ico) {
  width: 0.95rem;
  height: 0.95rem;
  transform: rotate(180deg);
}
.switch-id:hover {
  color: #1a1203;
  background: linear-gradient(135deg, #ffe08a, var(--primary));
  border-color: transparent;
}
</style>
