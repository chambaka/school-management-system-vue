<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { publicApi } from "../api/endpoints";
import { tzs } from "../utils/license";

const props = defineProps({
  billingModel: { type: String, default: "SUBSCRIPTION" },
  subscriptionPlan: { type: String, default: "BASIC" },
  billingCycle: { type: String, default: "MONTHLY" },
  hint: {
    type: String,
    default: "Choose subscription or a one-time purchase. You can switch later.",
  },
});

const emit = defineEmits(["update:billingModel", "update:subscriptionPlan", "update:billingCycle"]);

const catalog = ref({ models: [] });
const error = ref("");

const models = computed(() => catalog.value.models || []);
const selectedModel = computed(() => models.value.find((row) => row.id === props.billingModel) || models.value[0]);
const packages = computed(() => selectedModel.value?.packages || []);
const selectedPack = computed(() => packages.value.find((row) => row.id === props.subscriptionPlan) || packages.value[0]);
const isSubscription = computed(() => (selectedModel.value?.id || props.billingModel) === "SUBSCRIPTION");

onMounted(async () => {
  try {
    catalog.value = await publicApi.licensePlans();
  } catch (e) {
    error.value = e.message;
  }
});

watch(
  () => [props.billingModel, catalog.value.models],
  () => {
    if (!packages.value.length) return;
    if (!packages.value.some((row) => row.id === props.subscriptionPlan)) {
      choosePackage(packages.value[0]);
    }
  },
);

function chooseModel(model) {
  emit("update:billingModel", model.id);
  const next = model.packages?.[0];
  if (next) choosePackage(next, model.id);
}

function choosePackage(pack, modelId = props.billingModel) {
  emit("update:subscriptionPlan", pack.id);
  if ((modelId || pack.id) && (modelId === "PURCHASE" || !pack.prices?.length)) {
    emit("update:billingCycle", "");
  } else if (!pack.prices?.some((row) => row.cycle === props.billingCycle)) {
    emit("update:billingCycle", pack.prices?.[0]?.cycle || "MONTHLY");
  }
}

function chooseCycle(cycle) {
  emit("update:billingCycle", cycle);
}
</script>

<template>
  <fieldset class="license">
    <legend>License</legend>
    <p class="hint">{{ hint }}</p>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="choices">
      <button
        v-for="model in models"
        :key="model.id"
        class="choice"
        type="button"
        :class="{ on: model.id === billingModel }"
        @click="chooseModel(model)"
      >
        <strong>{{ model.name }}</strong>
        <span>{{ model.summary }}</span>
      </button>
    </div>
    <div class="packs">
      <button
        v-for="pack in packages"
        :key="pack.id"
        class="pack"
        type="button"
        :class="{ on: pack.id === subscriptionPlan }"
        @click="choosePackage(pack)"
      >
        <strong>{{ pack.name }}</strong>
        <span class="size">{{ pack.schoolSize }}</span>
        <span v-if="isSubscription && pack.prices?.[0]" class="price">{{ tzs(pack.prices[0].amountTzs) }} / month</span>
        <span v-else-if="pack.oneTimeFeeTzs != null" class="price">{{ tzs(pack.oneTimeFeeTzs) }} one-time</span>
        <span v-if="pack.setupFeeTzs != null" class="extra">Setup {{ tzs(pack.setupFeeTzs) }}</span>
        <span v-if="pack.annualMaintenanceTzs != null" class="extra">Annual maint. {{ tzs(pack.annualMaintenanceTzs) }}</span>
        <span v-if="pack.sourceCodeAddonTzs != null" class="extra">Source-code add-on {{ tzs(pack.sourceCodeAddonTzs) }}</span>
        <span v-if="pack.sourceCodeIncluded" class="extra">Source code included</span>
        <span class="extra">Control numbers: {{ pack.controlNumberFee }}</span>
      </button>
    </div>
    <div v-if="isSubscription && selectedPack?.prices?.length" class="cycles">
      <p class="hint tight">Billing period</p>
      <div class="cycle-row">
        <button
          v-for="price in selectedPack.prices"
          :key="price.cycle"
          class="btn"
          :class="price.cycle === billingCycle ? '' : 'btn-ghost'"
          type="button"
          @click="chooseCycle(price.cycle)"
        >
          {{ price.label }} · {{ tzs(price.amountTzs) }}
        </button>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.license {
  margin: 0;
  padding: 0;
  border: 0;
  display: grid;
  gap: 0.75rem;
}
legend {
  padding: 0;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
}
.hint.tight { margin-top: 0.2rem; }
.choices,
.packs {
  display: grid;
  gap: 0.55rem;
}
.choices {
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .choices { grid-template-columns: 1fr 1fr; }
  .packs { grid-template-columns: 1fr 1fr; }
}
.choice,
.pack {
  display: grid;
  gap: 0.28rem;
  text-align: left;
  padding: 0.85rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(4, 10, 22, 0.35);
  color: var(--text);
  cursor: pointer;
}
.choice.on,
.pack.on {
  border-color: color-mix(in srgb, var(--primary) 55%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent);
}
.choice strong,
.pack strong { font-size: 0.98rem; }
.choice span,
.pack span {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.35;
}
.pack .size { font-weight: 650; }
.pack .price {
  color: var(--primary);
  font-weight: 800;
  font-size: 0.88rem;
}
.cycle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
</style>
