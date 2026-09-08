<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { academicApi, financeApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const canManage = computed(() => auth.role === "ACCOUNTANT");
const canViewInvoices = computed(() => ["HEADMASTER", "ACCOUNTANT"].includes(auth.role));

const fees = ref([]);
const invoices = ref([]);
const years = ref([]);
const classes = ref([]);
const error = ref("");
const fee = reactive({
  academicYearId: "", schoolClassId: "", name: "Tuition", feeType: "TUITION",
  frequency: "TERM", amount: 150000, dueDate: "",
});
const gen = reactive({ academicYearId: "", schoolClassId: "", feeStructureIds: [], dueDate: "" });
const pay = reactive({ invoiceId: "", amount: "", method: "MOBILE_MONEY", transactionRef: "" });

function pickCurrentYear(yearList) {
  return yearList.find((y) => y.currentYear) || yearList[0] || null;
}

async function load() {
  const [yearList, classList] = await Promise.all([academicApi.years(), academicApi.classes()]);
  years.value = yearList;
  classes.value = classList;
  const current = pickCurrentYear(yearList);
  if (current) {
    if (!fee.academicYearId) fee.academicYearId = String(current.id);
    if (!gen.academicYearId) gen.academicYearId = String(current.id);
  }
  fees.value = await financeApi.fees(
    fee.academicYearId ? { academicYearId: fee.academicYearId } : undefined,
  );
  invoices.value = canViewInvoices.value
    ? (await financeApi.invoices({ size: 50 })).content || []
    : [];
}

async function addFee() {
  await financeApi.createFee({
    ...fee,
    academicYearId: Number(fee.academicYearId),
    schoolClassId: fee.schoolClassId ? Number(fee.schoolClassId) : null,
    amount: Number(fee.amount),
  });
  await load();
}

async function generate() {
  await financeApi.generate({
    academicYearId: Number(gen.academicYearId),
    schoolClassId: Number(gen.schoolClassId),
    feeStructureIds: fees.value.filter((f) => gen.feeStructureIds.includes(String(f.id))).map((f) => f.id),
    dueDate: gen.dueDate || null,
  });
  await load();
}

async function recordPay() {
  await financeApi.pay({
    invoiceId: Number(pay.invoiceId),
    amount: Number(pay.amount),
    method: pay.method,
    transactionRef: pay.transactionRef,
  });
  await load();
}

onMounted(async () => {
  try { await load(); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h1>Finance</h1><p class="sub">Fees, invoices, payments</p></div></div>
    <p v-if="error" class="banner banner-error">{{ error }}</p>
    <div class="glass card table-wrap">
      <h3>Fee structures</h3>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>
          <tr v-for="f in fees" :key="f.id">
            <td>{{ f.name }}</td>
            <td>{{ f.feeType }}</td>
            <td>{{ f.amount }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!fees.length" class="empty">No fee structures yet.</p>
    </div>
    <form v-if="canManage" class="glass card" data-confirm="Save this fee?" @submit.prevent="addFee">
      <h3>Fee structure</h3>
      <div class="grid grid-2">
        <label class="field"><span>Year</span>
          <select v-model="fee.academicYearId" required>
            <option disabled value="">Choose</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
        <label class="field"><span>Class</span>
          <select v-model="fee.schoolClassId">
            <option value="">All</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="field"><span>Name</span><input v-model="fee.name" required /></label>
        <label class="field"><span>Amount TZS</span><input v-model="fee.amount" type="number" required /></label>
        <label class="field"><span>Type</span>
          <select v-model="fee.feeType">
            <option>TUITION</option><option>TRANSPORT</option><option>EXAM</option><option>OTHER</option>
          </select>
        </label>
        <label class="field"><span>Due</span><input v-model="fee.dueDate" type="date" /></label>
      </div>
      <button class="btn">Save fee</button>
    </form>
    <form v-if="canManage" class="glass card" data-confirm="Generate invoices for this class?" @submit.prevent="generate">
      <h3>Generate invoices</h3>
      <div class="grid grid-2">
        <label class="field"><span>Year</span>
          <select v-model="gen.academicYearId" required>
            <option disabled value="">Choose</option>
            <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
          </select>
        </label>
        <label class="field"><span>Class</span>
          <select v-model="gen.schoolClassId" required>
            <option disabled value="">Choose</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
      </div>
      <label v-for="f in fees" :key="f.id" class="check">
        <input type="checkbox" :value="String(f.id)" v-model="gen.feeStructureIds" /> {{ f.name }} · {{ f.amount }}
      </label>
      <button class="btn">Generate</button>
    </form>
    <div v-if="canViewInvoices" class="glass card table-wrap">
      <table>
        <thead><tr><th>Invoice</th><th>Student</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="i in invoices" :key="i.id">
            <td>{{ i.invoiceNumber }}</td>
            <td>{{ i.studentName }}</td>
            <td>{{ i.totalAmount }}</td>
            <td>{{ i.paidAmount }}</td>
            <td><span class="chip">{{ i.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <form v-if="canManage" class="glass card" data-confirm="Record this payment?" @submit.prevent="recordPay">
      <h3>Record payment</h3>
      <div class="grid grid-2">
        <label class="field"><span>Invoice</span>
          <select v-model="pay.invoiceId" required>
            <option disabled value="">Choose</option>
            <option v-for="i in invoices" :key="i.id" :value="i.id">{{ i.invoiceNumber }} · {{ i.studentName }}</option>
          </select>
        </label>
        <label class="field"><span>Amount</span><input v-model="pay.amount" type="number" required /></label>
        <label class="field"><span>Method</span>
          <select v-model="pay.method">
            <option>CASH</option><option>CARD</option><option>BANK</option><option>MOBILE_MONEY</option>
          </select>
        </label>
        <label class="field"><span>Ref</span><input v-model="pay.transactionRef" /></label>
      </div>
      <button class="btn">Record</button>
    </form>
  </section>
</template>

<style scoped>
.check { display: flex; gap: 0.5rem; margin: 0.3rem 0; color: var(--muted); }
</style>
