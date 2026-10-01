<script setup>
import { onMounted, reactive, ref } from "vue";
import { schoolApi } from "../../api/endpoints";
import PhoneInput from "../../components/PhoneInput.vue";
import { useBrandingStore } from "../../stores/branding";
import { useFeedback } from "../../composables/useFeedback";


const branding = useBrandingStore();
const { error, ok } = useFeedback();
const form = reactive({
  name: "", email: "", phone: "", primaryColor: "#F5C451", secondaryColor: "#2EE6C8",
  accentColor: "#FF4D8D", timezone: "Africa/Dar_es_Salaam", currency: "TZS", locale: "en",
  country: "Tanzania", logoUrl: "", customDomain: "",
});

onMounted(async () => {
  try {
    const school = await schoolApi.current();
    Object.assign(form, school);
  } catch (e) {
    error.value = e.message;
  }
});

async function save() {
  ok.value = "";
  try {
    const school = await schoolApi.updateCurrent(form);
    Object.assign(form, school);
    branding.applySchool(school);
    ok.value = "Branding saved. Public login will pick up these colors.";
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Branding</h1><p class="sub">White-label colors and identity</p></div></div>
    <form class="glass card" data-confirm="Save this branding?" @submit.prevent="save">
      <div class="grid grid-2">
        <label class="field"><span>School name</span><input v-model="form.name" /></label>
        <label class="field"><span>Email</span><input v-model="form.email" /></label>
        <PhoneInput v-model="form.phone" />
        <label class="field"><span>Primary</span><input v-model="form.primaryColor" type="color" /></label>
        <label class="field"><span>Secondary</span><input v-model="form.secondaryColor" type="color" /></label>
        <label class="field"><span>Accent</span><input v-model="form.accentColor" type="color" /></label>
        <label class="field"><span>Timezone</span><input v-model="form.timezone" /></label>
        <label class="field"><span>Currency</span><input v-model="form.currency" /></label>
        <label class="field"><span>Domain</span><input v-model="form.customDomain" /></label>
        <label class="field"><span>Logo URL</span><input v-model="form.logoUrl" /></label>
      </div>
      <button class="btn">Save branding</button>
    </form>
  </section>
</template>
