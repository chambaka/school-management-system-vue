<script setup>
import { onMounted, ref, watch } from "vue";
import { locationApi } from "../api/endpoints";
import { formatLocationName } from "../utils/address";

const props = defineProps({
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(["update:modelValue"]);

const regions = ref([]);
const districts = ref([]);
const wards = ref([]);
const regionId = ref("");
const districtId = ref("");
const wardId = ref("");
const regionsLoading = ref(false);
const districtsLoading = ref(false);
const wardsLoading = ref(false);
const locationError = ref("");
const districtsFor = ref("");
const wardsFor = ref("");

function patch(partial) {
  emit("update:modelValue", { ...props.modelValue, ...partial });
}

function norm(value) {
  return (value || "").trim().toUpperCase();
}

function nodes(body) {
  return Array.isArray(body?.data) ? body.data : [];
}

async function loadRegions() {
  regionsLoading.value = true;
  locationError.value = "";
  try {
    regions.value = nodes(await locationApi.regions());
  } catch (e) {
    locationError.value = e.message || "Could not load regions";
    regions.value = [];
  } finally {
    regionsLoading.value = false;
    await syncFromValue();
  }
}

async function syncFromValue() {
  if (!regions.value.length) return;
  const region = regions.value.find((item) => norm(item.name) === norm(props.modelValue.region));
  if (!region) {
    regionId.value = "";
    districtId.value = "";
    wardId.value = "";
    districts.value = [];
    wards.value = [];
    return;
  }
  regionId.value = String(region.id);
  if (districtsFor.value !== String(region.id)) {
    districtsLoading.value = true;
    try {
      districts.value = nodes(await locationApi.districts(region.id));
      districtsFor.value = String(region.id);
    } catch (e) {
      locationError.value = e.message || "Could not load districts";
      districts.value = [];
      districtsFor.value = "";
    } finally {
      districtsLoading.value = false;
    }
  }
  const district = districts.value.find((item) => norm(item.name) === norm(props.modelValue.district));
  if (!district) {
    districtId.value = "";
    wardId.value = "";
    wards.value = [];
    wardsFor.value = "";
    return;
  }
  districtId.value = String(district.id);
  if (wardsFor.value !== String(district.id)) {
    wardsLoading.value = true;
    try {
      wards.value = nodes(await locationApi.wards(district.id));
      wardsFor.value = String(district.id);
    } catch (e) {
      locationError.value = e.message || "Could not load wards";
      wards.value = [];
      wardsFor.value = "";
    } finally {
      wardsLoading.value = false;
    }
  }
  const ward = wards.value.find((item) => norm(item.name) === norm(props.modelValue.ward));
  wardId.value = ward ? String(ward.id) : "";
}

async function onRegionChange(event) {
  const id = event.target.value;
  regionId.value = id;
  districtId.value = "";
  wardId.value = "";
  districts.value = [];
  wards.value = [];
  districtsFor.value = "";
  wardsFor.value = "";
  const region = regions.value.find((item) => String(item.id) === String(id));
  patch({ region: region?.name || "", district: "", ward: "" });
  if (!region) return;
  districtsLoading.value = true;
  locationError.value = "";
  try {
    districts.value = nodes(await locationApi.districts(region.id));
    districtsFor.value = String(region.id);
  } catch (e) {
    locationError.value = e.message || "Could not load districts";
  } finally {
    districtsLoading.value = false;
  }
}

async function onDistrictChange(event) {
  const id = event.target.value;
  districtId.value = id;
  wardId.value = "";
  wards.value = [];
  wardsFor.value = "";
  const district = districts.value.find((item) => String(item.id) === String(id));
  patch({ district: district?.name || "", ward: "" });
  if (!district) return;
  wardsLoading.value = true;
  locationError.value = "";
  try {
    wards.value = nodes(await locationApi.wards(district.id));
    wardsFor.value = String(district.id);
  } catch (e) {
    locationError.value = e.message || "Could not load wards";
  } finally {
    wardsLoading.value = false;
  }
}

function onWardChange(event) {
  const id = event.target.value;
  wardId.value = id;
  const ward = wards.value.find((item) => String(item.id) === String(id));
  patch({ ward: ward?.name || "" });
}

onMounted(loadRegions);

watch(
  () => [props.modelValue.region, props.modelValue.district, props.modelValue.ward],
  () => {
    syncFromValue();
  },
);
</script>

<template>
  <div class="address-fields">
    <p v-if="locationError" class="sub loc-error">{{ locationError }}</p>
    <div class="loc-grid">
      <label class="field">
        <span>Region / Mkoa</span>
        <select required :disabled="regionsLoading" :value="regionId" @change="onRegionChange">
          <option value="" disabled>{{ regionsLoading ? "Loading…" : "Select region" }}</option>
          <option v-for="region in regions" :key="region.id" :value="String(region.id)">{{ formatLocationName(region.name) }}</option>
        </select>
      </label>
      <label class="field">
        <span>District / Wilaya</span>
        <select required :disabled="!regionId || districtsLoading" :value="districtId" @change="onDistrictChange">
          <option value="" disabled>{{ !regionId ? "Select region first" : districtsLoading ? "Loading…" : "Select district" }}</option>
          <option v-for="district in districts" :key="district.id" :value="String(district.id)">{{ formatLocationName(district.name) }}</option>
        </select>
      </label>
      <label class="field">
        <span>Ward / Kata</span>
        <select required :disabled="!districtId || wardsLoading" :value="wardId" @change="onWardChange">
          <option value="" disabled>{{ !districtId ? "Select district first" : wardsLoading ? "Loading…" : "Select ward" }}</option>
          <option v-for="ward in wards" :key="ward.id" :value="String(ward.id)">{{ formatLocationName(ward.name) }}</option>
        </select>
      </label>
    </div>
    <label class="field">
      <span>Street / address line</span>
      <input
        required
        maxlength="180"
        autocomplete="off"
        placeholder="Mtaa, jengo, nambari ya nyumba"
        :value="modelValue.line"
        @input="patch({ line: $event.target.value })"
      />
    </label>
    <label class="field">
      <span>P.O. Box</span>
      <input
        maxlength="40"
        autocomplete="off"
        placeholder="P.O. Box 1234"
        :value="modelValue.box"
        @input="patch({ box: $event.target.value })"
      />
    </label>
  </div>
</template>

<style scoped>
.address-fields {
  grid-column: 1 / -1;
  display: grid;
  gap: 0.75rem;
}
.loc-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}
.loc-error {
  margin: 0;
}
@media (max-width: 720px) {
  .loc-grid {
    grid-template-columns: 1fr;
  }
}
</style>
