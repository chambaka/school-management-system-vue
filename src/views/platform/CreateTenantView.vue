<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { tenantApi } from "../../api/endpoints";
import PhoneInput from "../../components/PhoneInput.vue";
import { useFeedback } from "../../composables/useFeedback";


const router = useRouter();
const { error } = useFeedback();
const saving = ref(false);
const form = reactive({ name: "", email: "", phone: "", country: "Tanzania" });

async function createTenant() {
  error.value = "";
  saving.value = true;
  try {
    await tenantApi.platformCreate(form);
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
      <div class="row-actions">
        <button class="btn" :disabled="saving">{{ saving ? "Creating…" : "Create tenant" }}</button>
        <router-link class="btn btn-ghost" to="/platform/tenants">Cancel</router-link>
      </div>
    </form>
  </section>
</template>

<style scoped>
.form {
  max-width: 36rem;
}
</style>
