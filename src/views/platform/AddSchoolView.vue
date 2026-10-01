<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { tenantApi } from "../../api/endpoints";
import PhoneInput from "../../components/PhoneInput.vue";
import { useFeedback } from "../../composables/useFeedback";


const route = useRoute();
const router = useRouter();
const { error } = useFeedback();
const saving = ref(false);
const organization = ref("");
const tenantStatus = ref("");
const tenantId = computed(() => route.params.tenantId);
const backTo = computed(() => (tenantId.value ? "/platform/tenants" : "/tenant/schools"));
const form = reactive({
  name: "",
  email: "",
  phone: "",
  country: "Tanzania",
});

onMounted(async () => {
  try {
    if (tenantId.value) {
      const tenant = await tenantApi.platformGet(tenantId.value);
      organization.value = tenant.name;
      tenantStatus.value = tenant.status;
    } else {
      const tenant = await tenantApi.current();
      organization.value = tenant.name;
      tenantStatus.value = tenant.status;
    }
    if (tenantStatus.value && tenantStatus.value !== "ACTIVE") {
      error.value = "Schools can only be added to an active organization";
    }
  } catch (e) {
    error.value = e.message;
  }
});

async function addSchool() {
  error.value = "";
  saving.value = true;
  try {
    if (tenantId.value) {
      await tenantApi.platformAddSchool(tenantId.value, form);
    } else {
      await tenantApi.addSchool(form);
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
        <h1>Add school</h1>
        <p class="sub">{{ organization ? `New school in ${organization}` : "Add a school to this organization" }}</p>
      </div>
      <router-link class="btn btn-ghost" :to="backTo">Back</router-link>
    </div>
    <form class="glass card form" data-confirm="Add this school?" @submit.prevent="addSchool">
      <label class="field"><span>School name</span><input v-model="form.name" required /></label>
      <label class="field"><span>Email</span><input v-model="form.email" type="email" /></label>
      <PhoneInput v-model="form.phone" />
      <label class="field"><span>Country</span><input v-model="form.country" /></label>
      <div class="row-actions">
        <button class="btn" :disabled="saving || tenantStatus !== 'ACTIVE'">{{ saving ? "Adding…" : "Add school" }}</button>
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
