<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AccountantFinanceNav from "../../components/AccountantFinanceNav.vue";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { academicApi, financeApi, peopleApi } from "../../api/endpoints";
import { useAuthStore } from "../../stores/auth";
import { financeSectionMeta } from "../../utils/financeNav";
import { linesWithPayment, PAY_MARK } from "../../utils/invoiceLines";
import { FEE_TYPES, feeTypeIcon, feeIconForText } from "../../utils/feeTypes";
import { useListSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";


const route = useRoute();
const auth = useAuthStore();
const canManage = computed(() => auth.role === "ACCOUNTANT");
const canViewInvoices = computed(() => ["HEADMASTER", "SCHOOL_ADMIN", "ACCOUNTANT"].includes(auth.role));
const isParent = computed(() => auth.role === "PARENT");
const section = computed(() => route.meta.financeSection || "all");
const heading = computed(() => financeSectionMeta[section.value] || financeSectionMeta.all);
const showAccountantNav = computed(() => auth.role === "ACCOUNTANT");

function show(name) {
  return section.value === "all" || section.value === name;
}

const fees = ref([]);
const invoices = ref([]);
const { query: feeQuery, filteredRows: filteredFees } = useListSearch(fees, (f) => [
  f.name, f.feeType, f.frequency, f.periodLabel, f.dueDate, f.schoolClassName, f.amount,
]);
const { query: invoiceQuery, filteredRows: filteredInvoices } = useListSearch(invoices, (i) => [
  i.invoiceNumber, i.studentName, i.status, i.billingQuarter, i.totalAmount, i.balance,
]);
const years = ref([]);
const classes = ref([]);
const children = ref([]);
const students = ref([]);
const ledgerStudentId = ref("");
const ledger = ref(null);
const ledgerEntries = ref([]);
const invoicePayments = ref({});
const feeFormOpen = ref(false);
const generateOpen = ref(false);
const editingFeeId = ref(null);
const editingPeriod = ref("");
const { error } = useFeedback();
const fee = reactive({
  academicYearId: "", schoolClassId: "", feeType: "TUITION",
  frequency: "TERM", amount: 150000, dueDate: "",
});

function feeLabel(type) {
  const text = String(type || "Fee").replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const dueDateActive = computed(() => (
  editingFeeId.value ? fee.frequency !== "YEARLY" : fee.frequency === "ONE_TIME"
));

const frequencyNote = computed(() => {
  if (editingFeeId.value && fee.frequency === "YEARLY") {
    return "The due date stays the end of the academic year.";
  }
  if (editingFeeId.value) return "Change the amount or due date for this line only.";
  if (fee.frequency === "TERM") return "One line is created for each term in this year. The due date is the end of that term.";
  if (fee.frequency === "MONTHLY") return "Twelve lines are created, one for each month. The due date is the last day of the month.";
  if (fee.frequency === "YEARLY") return "One line is created. The due date is the end of the academic year.";
  return "Enter the date this one-time fee is due.";
});
const gen = reactive({
  academicYearId: "", schoolClassId: "", feeStructureId: "", dueDate: "",
});
const pay = reactive({ invoiceId: "", amount: "", method: "MOBILE_MONEY", transactionRef: "" });
const discount = reactive({ invoiceId: "", amount: "", reason: "" });

function pickCurrentYear(yearList) {
  return yearList.find((y) => y.currentYear) || yearList[0] || null;
}

async function loadLookups() {
  const [yearResult, classResult] = await Promise.allSettled([
    academicApi.years(),
    academicApi.classes(),
  ]);
  years.value = yearResult.status === "fulfilled" ? yearResult.value : [];
  classes.value = classResult.status === "fulfilled" ? classResult.value : [];
  const current = pickCurrentYear(years.value);
  if (current) {
    if (!fee.academicYearId) fee.academicYearId = String(current.id);
    if (!gen.academicYearId) gen.academicYearId = String(current.id);
  }
}

async function load() {
  await loadLookups();
  fees.value = await financeApi.fees(
    fee.academicYearId ? { academicYearId: fee.academicYearId } : undefined,
  );
  invoices.value = canViewInvoices.value
    ? (await financeApi.invoices({ size: 50 })).content || []
    : [];
  if (canViewInvoices.value) {
    students.value = (await peopleApi.students({ size: 200 })).content || [];
    if (students.value[0] && !ledgerStudentId.value) ledgerStudentId.value = String(students.value[0].id);
  }
  if (isParent.value) {
    children.value = await peopleApi.myChildren();
    if (children.value[0] && !ledgerStudentId.value) ledgerStudentId.value = String(children.value[0].studentId);
  }
  if (ledgerStudentId.value) await loadLedger();
}

async function loadLedger() {
  if (!ledgerStudentId.value) return;
  ledger.value = await financeApi.studentLedger(ledgerStudentId.value);
  ledgerEntries.value = await financeApi.ledgerEntries(ledgerStudentId.value).catch(() => []);
  invoicePayments.value = {};
  for (const inv of ledger.value.payments || []) {
    invoicePayments.value[inv.id] = inv;
  }
}

function className(id) {
  if (!id) return "All classes";
  return classes.value.find((c) => String(c.id) === String(id))?.name || "Class";
}

function openFeeForm() {
  editingFeeId.value = null;
  editingPeriod.value = "";
  fee.dueDate = "";
  feeFormOpen.value = true;
}

function openEditFee(row) {
  editingFeeId.value = row.id;
  editingPeriod.value = row.periodLabel || "";
  fee.academicYearId = String(row.academicYearId || "");
  fee.schoolClassId = row.schoolClassId ? String(row.schoolClassId) : "";
  fee.feeType = row.feeType;
  fee.frequency = row.frequency;
  fee.amount = row.amount;
  fee.dueDate = row.dueDate || "";
  feeFormOpen.value = true;
}

function closeFeeForm() {
  feeFormOpen.value = false;
}

async function removeFee(row) {
  try {
    await financeApi.deleteFee(row.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function addFee() {
  try {
    if (editingFeeId.value) {
      await financeApi.updateFee(editingFeeId.value, {
        amount: Number(fee.amount),
        dueDate: fee.frequency === "YEARLY" ? null : fee.dueDate,
      });
    } else {
      await financeApi.createFee({
        academicYearId: Number(fee.academicYearId),
        schoolClassId: fee.schoolClassId ? Number(fee.schoolClassId) : null,
        name: feeLabel(fee.feeType),
        feeType: fee.feeType,
        frequency: fee.frequency,
        amount: Number(fee.amount),
        dueDate: fee.frequency === "ONE_TIME" ? fee.dueDate : null,
      });
    }
    feeFormOpen.value = false;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function openGenerate() {
  generateOpen.value = true;
}

function closeGenerate() {
  generateOpen.value = false;
}

async function removeInvoiceItem(invoice, item) {
  try {
    await financeApi.deleteInvoiceItem(invoice.id, item.id);
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function generate() {
  try {
    await financeApi.generate({
      academicYearId: Number(gen.academicYearId),
      schoolClassId: gen.schoolClassId ? Number(gen.schoolClassId) : null,
      feeStructureIds: gen.feeStructureId ? [Number(gen.feeStructureId)] : [],
      dueDate: gen.dueDate || null,
    });
    generateOpen.value = false;
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

const applicableFees = computed(() => {
  const classId = gen.schoolClassId ? Number(gen.schoolClassId) : null;
  return fees.value.filter((f) => {
    if (String(f.academicYearId) !== String(gen.academicYearId)) return false;
    if (!classId) return true;
    return !f.schoolClassId || Number(f.schoolClassId) === classId;
  });
});

function feeOption(row) {
  return [feeLabel(row.feeType), row.periodLabel, row.schoolClassName || "All classes", row.amount]
    .filter(Boolean)
    .join(" · ");
}

watch(applicableFees, (rows) => {
  if (!rows.some((row) => String(row.id) === String(gen.feeStructureId))) {
    gen.feeStructureId = "";
  }
});

const selectedFee = computed(() => applicableFees.value.find((item) => String(item.id) === String(gen.feeStructureId)));

watch(() => gen.feeStructureId, (id) => {
  const row = applicableFees.value.find((item) => String(item.id) === String(id));
  gen.dueDate = row?.dueDate || "";
});

async function recordPay() {
  await financeApi.pay({
    invoiceId: Number(pay.invoiceId),
    amount: Number(pay.amount),
    method: pay.method,
    transactionRef: pay.transactionRef,
  });
  await load();
}

async function applyDiscount() {
  await financeApi.applyDiscount(discount.invoiceId, {
    amount: Number(discount.amount),
    reason: discount.reason || null,
  });
  discount.amount = "";
  discount.reason = "";
  await load();
}

async function downloadReceipt(paymentId) {
  try {
    await financeApi.receiptPdf(paymentId);
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(async () => {
  try { await load(); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <section class="page">
    <AccountantFinanceNav v-if="showAccountantNav" class="mobile-fin" variant="panel" />
    <div class="page-head"><div><h1>{{ heading.title }}</h1><p class="sub">{{ heading.sub }}</p></div></div>
    <div v-if="show('fee-structures') && !isParent" class="glass card table-wrap">
      <div class="list-head">
        <div>
          <h3 v-if="section === 'all'">Fee structures</h3>
          <p v-if="section === 'all'" class="sub">Leave class as All to use the same amount for every class. Pick a class to set a different tuition or transport rate for that level.</p>
        </div>
        <div class="list-tools">
          <ListSearch v-model="feeQuery" placeholder="Search fees" />
          <button v-if="canManage" class="btn add-btn" type="button" @click="openFeeForm">
            <Icon name="plus" />
            Add fee structure
          </button>
        </div>
      </div>
      <table>
        <thead><tr><th>Type</th><th>Line</th><th>Class</th><th>Frequency</th><th>Due</th><th>Amount</th><th v-if="canManage"></th></tr></thead>
        <tbody>
          <tr v-for="f in filteredFees" :key="f.id">
            <td>
              <span class="fee-type">
                <Icon :name="feeTypeIcon(f.feeType)" />
                {{ feeLabel(f.feeType) }}
              </span>
            </td>
            <td>{{ f.periodLabel || "—" }}</td>
            <td>{{ f.schoolClassName || "All classes" }}</td>
            <td>{{ feeLabel(f.frequency) }}</td>
            <td>{{ f.dueDate || "—" }}</td>
            <td>{{ f.amount }}</td>
            <td v-if="canManage">
              <div class="row-actions">
                <button class="btn btn-ghost line-edit" type="button" @click="openEditFee(f)">
                  <Icon name="pen" />
                  Edit
                </button>
                <button
                  class="icon-btn"
                  type="button"
                  :aria-label="`Delete ${feeLabel(f.feeType)} ${f.periodLabel || ''}`.trim()"
                  title="Delete"
                  v-confirm="{ message: `Delete ${feeLabel(f.feeType)}${f.periodLabel ? ' · ' + f.periodLabel : ''}?`, danger: true }"
                  @click="removeFee(f)"
                ><Icon name="trash" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!filteredFees.length" class="empty">{{ feeQuery.trim() ? "No fees match that search." : "No fee structures yet." }}</p>
    </div>
    <Teleport to="body">
      <div v-if="feeFormOpen" class="form-scrim" role="presentation" @click.self="closeFeeForm">
        <form
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fee-form-title"
          :data-confirm="editingFeeId ? 'Save changes to this fee line?' : 'Save this fee?'"
          @submit.prevent="addFee"
        >
          <div class="form-head">
            <div>
              <h3 id="fee-form-title">{{ editingFeeId ? "Edit fee line" : "Add fee structure" }}</h3>
              <p class="sub">{{ editingFeeId ? `${feeLabel(fee.feeType)} · ${editingPeriod || "Fee"} · ${className(fee.schoolClassId)}` : "Leave class as All to use the same amount for every class." }}</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeFeeForm">Close</button>
          </div>
          <div class="grid grid-2">
            <template v-if="!editingFeeId">
              <label class="field"><span>Year</span>
                <select v-model="fee.academicYearId" required>
                  <option disabled value="">Choose</option>
                  <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
                </select>
              </label>
              <label class="field"><span>Class</span>
                <select v-model="fee.schoolClassId">
                  <option value="">All classes (same amount)</option>
                  <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </label>
              <div class="field fee-type-field">
                <span>Type</span>
                <div class="fee-types">
                  <button
                    v-for="type in FEE_TYPES"
                    :key="type.value"
                    class="fee-type-btn"
                    :class="{ on: fee.feeType === type.value }"
                    type="button"
                    :aria-pressed="fee.feeType === type.value"
                    @click="fee.feeType = type.value"
                  >
                    <Icon :name="type.icon" />
                    {{ type.label }}
                  </button>
                </div>
              </div>
              <label class="field"><span>Frequency</span>
                <select v-model="fee.frequency">
                  <option value="TERM">Term</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="ONE_TIME">One time</option>
                </select>
              </label>
            </template>
            <label class="field"><span>Amount TZS</span><input v-model="fee.amount" type="number" min="1" required /></label>
            <label v-if="dueDateActive" class="field"><span>Due</span><input v-model="fee.dueDate" type="date" required /></label>
            <p v-else-if="editingFeeId && fee.dueDate" class="sub">Due {{ fee.dueDate }}. This date stays calculated.</p>
          </div>
          <p class="sub">{{ frequencyNote }}</p>
          <div class="row-actions form-footer">
            <button class="btn">{{ editingFeeId ? "Save line" : "Save fee" }}</button>
            <button class="btn btn-ghost" type="button" @click="closeFeeForm">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
    <div v-if="show('invoices') && canViewInvoices" class="glass card">
      <div class="list-head">
        <h3 v-if="section === 'all'">Invoices</h3>
        <div class="list-tools">
          <ListSearch v-model="invoiceQuery" placeholder="Search invoices" />
          <button v-if="canManage" class="btn add-btn" type="button" @click="openGenerate">
            <Icon name="plus" />
            Generate invoices
          </button>
        </div>
      </div>
      <ul v-if="filteredInvoices.length" class="invoice-list">
        <li v-for="i in filteredInvoices" :key="i.id" class="invoice-card">
          <div class="invoice-top">
            <div>
              <strong>{{ i.invoiceNumber }}</strong>
              <p class="sub">{{ i.studentName }}<template v-if="i.admissionNo"> · {{ i.admissionNo }}</template></p>
            </div>
            <span class="chip">{{ i.status }}</span>
          </div>
          <p class="invoice-facts">
            <span>Total {{ i.totalAmount }}</span>
            <span>Paid {{ i.paidAmount }}</span>
            <span>Balance {{ i.balance }}</span>
            <span v-if="i.dueDate">Due {{ i.dueDate }}</span>
          </p>
          <ul v-if="i.items?.length" class="invoice-items">
            <li v-for="item in linesWithPayment(i)" :key="item.id">
              <span class="pay-mark" :class="`pay-${item.payState}`" :title="PAY_MARK[item.payState].label">
                <Icon :name="PAY_MARK[item.payState].icon" />
                <span class="sr">{{ PAY_MARK[item.payState].label }}</span>
              </span>
              <span class="line-label">
                <Icon :name="feeIconForText(item.description)" />
                {{ item.description }}
              </span>
              <span>{{ item.amount }}</span>
              <button
                v-if="canManage"
                class="icon-btn"
                type="button"
                :aria-label="`Delete ${item.description}`"
                title="Delete"
                v-confirm="{ message: `Delete ${item.description}?`, danger: true }"
                @click="removeInvoiceItem(i, item)"
              ><Icon name="trash" /></button>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="empty">{{ invoiceQuery.trim() ? "No invoices match that search." : "No invoices yet." }}</p>
    </div>
    <Teleport to="body">
      <div v-if="generateOpen" class="form-scrim" role="presentation" @click.self="closeGenerate">
        <form
          class="glass card form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="generate-title"
          data-confirm="Generate invoices for the selected fee structure?"
          @submit.prevent="generate"
        >
          <div class="form-head">
            <div>
              <h3 id="generate-title">Generate invoices</h3>
              <p class="sub">Creates one invoice per student for the fee structure you choose. The due date comes from that fee line.</p>
            </div>
            <button class="btn btn-ghost" type="button" @click="closeGenerate">Close</button>
          </div>
          <div class="grid grid-2">
            <label class="field"><span>Year</span>
              <select v-model="gen.academicYearId" required>
                <option disabled value="">Choose</option>
                <option v-for="y in years" :key="y.id" :value="y.id">{{ y.name }}</option>
              </select>
            </label>
            <label class="field"><span>Class</span>
              <select v-model="gen.schoolClassId">
                <option value="">All classes</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="field"><span>Fee structure</span>
              <span class="fee-pick">
                <Icon v-if="selectedFee" :name="feeTypeIcon(selectedFee.feeType)" />
                <select v-model="gen.feeStructureId" required>
                  <option disabled value="">Choose</option>
                  <option v-for="f in applicableFees" :key="f.id" :value="String(f.id)">{{ feeOption(f) }}</option>
                </select>
              </span>
            </label>
          </div>
          <p v-if="gen.dueDate" class="sub">Due {{ gen.dueDate }}</p>
          <p v-if="!applicableFees.length" class="empty">No fees for this year and class.</p>
          <div class="row-actions form-footer">
            <button class="btn">Generate invoices</button>
            <button class="btn btn-ghost" type="button" @click="closeGenerate">Cancel</button>
          </div>
        </form>
      </div>
    </Teleport>
    <form v-if="show('record-payment') && canManage" class="glass card" data-confirm="Record this payment?" @submit.prevent="recordPay">
      <h3 v-if="section === 'all'">Record payment</h3>
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
    <form v-if="show('discount') && canManage" class="glass card" data-confirm="Apply this discount?" @submit.prevent="applyDiscount">
      <h3 v-if="section === 'all'">Discount</h3>
      <div class="grid grid-2">
        <label class="field"><span>Invoice</span>
          <select v-model="discount.invoiceId" required>
            <option disabled value="">Choose</option>
            <option v-for="i in invoices" :key="i.id" :value="i.id">{{ i.invoiceNumber }}</option>
          </select>
        </label>
        <label class="field"><span>Amount</span><input v-model="discount.amount" type="number" required /></label>
        <label class="field"><span>Reason</span><input v-model="discount.reason" /></label>
      </div>
      <button class="btn">Apply discount</button>
    </form>
    <div v-if="show('ledger')" class="glass card">
      <h3 v-if="section === 'all'">Student ledger</h3>
      <label v-if="isParent" class="field">
        <span>Child</span>
        <select v-model="ledgerStudentId" @change="loadLedger">
          <option disabled value="">Choose</option>
          <option v-for="c in children" :key="c.studentId" :value="c.studentId">{{ c.studentName }}</option>
        </select>
      </label>
      <label v-else class="field">
        <span>Student</span>
        <select v-model="ledgerStudentId" @change="loadLedger">
          <option disabled value="">Choose</option>
          <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }} · {{ s.admissionNo }}</option>
        </select>
      </label>
      <p v-if="ledger">Invoiced {{ ledger.invoiced }} · Discounts {{ ledger.discounts }} · Paid {{ ledger.paid }} · Outstanding {{ ledger.outstanding }}</p>
      <ul v-if="ledgerEntries.length">
        <li v-for="e in ledgerEntries" :key="e.id">
          {{ e.entryType }} {{ e.amount }} · {{ e.description }}
        </li>
      </ul>
      <ul v-if="ledger">
        <li v-for="p in ledger.payments" :key="p.id">
          {{ p.amount }} · {{ p.method }} · {{ p.paidAt || p.createdAt || "" }}
          <button class="btn btn-ghost" type="button" @click="downloadReceipt(p.id)">Receipt PDF</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.list-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.list-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  margin-left: auto;
}
.add-btn {
  min-height: 2.75rem;
  padding: 0.7rem 1.2rem;
  font-size: 0.95rem;
}
.form-scrim {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: start center;
  padding: 1.25rem 1.25rem calc(5.5rem + env(safe-area-inset-bottom, 0px));
  overflow: auto;
  background: rgba(4, 10, 22, 0.72);
}
.form-modal {
  width: min(48rem, 100%);
  margin: auto 0;
}
.form-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.85rem;
}
.form-head .btn {
  flex: 0 0 auto;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
}
.form-footer {
  margin-top: 0.85rem;
}
.form-footer .btn {
  padding: 0.88rem 1.25rem;
  font-size: inherit;
}
.line-edit {
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
}
.fee-type,
.line-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.fee-type .ico,
.line-label .ico,
.fee-type-btn .ico {
  color: #f5c451;
}
.fee-type-field {
  grid-column: 1 / -1;
}
.fee-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.35rem;
}
.fee-type-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(245, 196, 81, 0.28);
  background: transparent;
  color: inherit;
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}
.fee-type-btn.on {
  color: #f5c451;
  border-color: #f5c451;
}
.fee-pick {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.fee-pick .ico { color: #f5c451; }
.fee-pick select { flex: 1; }
.invoice-list {
  list-style: none;
  margin: 0.85rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}
.invoice-card {
  display: grid;
  gap: 0.45rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--stroke-strong);
  border-radius: 16px;
  background: var(--inset);
}
.invoice-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}
.invoice-top .sub { margin: 0.15rem 0 0; }
.invoice-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.9rem;
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
}
.invoice-items {
  list-style: none;
  margin: 0.2rem 0 0;
  padding: 0.55rem 0 0;
  border-top: 1px solid var(--stroke-strong);
  display: grid;
  gap: 0.4rem;
}
.invoice-items li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 0.65rem;
  align-items: center;
}
.pay-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
}
.pay-paid { color: #17310f; background: #b6e7a3; }
.pay-partial { color: #4a3208; background: #f5c451; }
.pay-unpaid { color: #f3c1c1; background: transparent; box-shadow: inset 0 0 0 1.5px #c45c5c; }
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.check { display: flex; gap: 0.5rem; margin: 0.3rem 0; color: var(--muted); }
.mobile-fin { margin-bottom: 1rem; }
@media (min-width: 900px) {
  .mobile-fin { display: none; }
}
</style>
