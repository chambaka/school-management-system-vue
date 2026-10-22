<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { tenantApi } from "../../api/endpoints";
import LicensePicker from "../../components/LicensePicker.vue";
import PhoneInput from "../../components/PhoneInput.vue";
import { useFeedback } from "../../composables/useFeedback";
import { emptyLicense } from "../../utils/license";


const router = useRouter();
const { error } = useFeedback();
const saving = ref(false);
const form = reactive({ name: "", email: "", phone: "", country: "Tanzania", ...emptyLicense() });

async function createTenant() {
  error.value = "";
  saving.value = true;
  try {
    await tenantApi.platformCreate({
      ...form,
      billingCycle: form.billingCycle || null,
    });
    router.push("/platform/tenants");
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
        <h1>Create tenant</h1>
        <p class="sub">Add a new organization. Schools can be added from the tenant list.</p>
      </div>
      <router-link class="btn btn-ghost" to="/platform/tenants">Back to tenants</router-link>
    </div>
    <form class="glass card form" data-confirm="Create this organization?" @submit.prevent="createTenant">
      <label class="field"><span>Organization name</span><input v-model="form.name" required /></label>
      <label class="field"><span>Email</span><input v-model="form.email" type="email" /></label>
      <PhoneInput v-model="form.phone" />
      <label class="field"><span>Country</span><input v-model="form.country" /></label>
      <LicensePicker
        v-model:billing-model="form.billingModel"
        v-model:subscription-plan="form.subscriptionPlan"
        v-model:billing-cycle="form.billingCycle"
      />
      <div class="row-actions">
        <button class="btn" :disabled="saving">{{ saving ? "Creating…" : "Create tenant" }}</button>
        <router-link class="btn btn-ghost" to="/platform/tenants">Cancel</router-link>
      </div>
    </form>
  </section>
</template>

<style scoped>
.form {
  max-width: 52rem;
}
</style>
