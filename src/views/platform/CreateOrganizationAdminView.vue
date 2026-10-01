<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { tenantApi } from "../../api/endpoints";
import PasswordStrengthInput from "../../components/PasswordStrengthInput.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import { useFeedback } from "../../composables/useFeedback";

const route = useRoute();
const router = useRouter();
const { error } = useFeedback();
const saving = ref(false);
const passwordOk = ref(false);
const organization = ref("");
const admins = ref([]);
const tenantId = computed(() => route.params.tenantId);
const backTo = computed(() => (tenantId.value ? "/platform/tenants" : "/tenant/schools"));
const form = reactive({ name: "", email: "", password: "", phone: "" });
const canSave = computed(() => (form.password ? passwordOk.value : Boolean(form.phone)));

onMounted(async () => {
  try {
    if (tenantId.value) {
      const tenant = await tenantApi.platformGet(tenantId.value);
      organization.value = tenant.name;
      admins.value = await tenantApi.platformAdmins(tenantId.value);
    } else {
      const tenant = await tenantApi.current();
      organization.value = tenant.name;
      admins.value = await tenantApi.currentAdmins();
    }
  } catch (e) {
    error.value = e.message;
  }
});

async function createAdmin() {
  error.value = "";
  saving.value = true;
  try {
    const body = {
      name: form.name,
      email: form.email,
      password: form.password || null,
      phone: form.phone,
    };
    if (tenantId.value) {
      await tenantApi.platformCreateAdmin(tenantId.value, body);
    } else {
      await tenantApi.createCurrentAdmin(body);
    }
    router.push(backTo.value);
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Add organization admin</h1>
        <p class="sub">{{ organization ? `New organization admin for ${organization}` : "Create an organization admin" }}</p>
      </div>
      <router-link class="btn btn-ghost" :to="backTo">Back</router-link>
    </div>
    <p v-if="admins.length" class="banner">
      Already in this organization: {{ admins.map((admin) => admin.name).join(", ") }}
    </p>
    <form class="glass card form" data-confirm="Create this organization admin?" @submit.prevent="createAdmin">
      <label class="field"><span>Name</span><input v-model="form.name" required /></label>
      <label class="field"><span>Email</span><input v-model="form.email" type="email" required /></label>
      <PhoneInput v-model="form.phone" :required="!form.password" />
      <PasswordStrengthInput
        v-model="form.password"
        label="Password (optional)"
        hint="Leave blank to generate a temporary password and send it by SMS to their phone."
        :email="form.email"
        :name="form.name"
        @valid-change="passwordOk = $event"
      />
      <div class="row-actions">
        <button class="btn" :disabled="saving || !canSave">{{ saving ? "Creating…" : "Create organization admin" }}</button>
        <router-link class="btn btn-ghost" :to="backTo">Cancel</router-link>
      </div>
    </form>
  </section>
</template>

<style scoped>
.form {
  max-width: 36rem;
}
</style>
