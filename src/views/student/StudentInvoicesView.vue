<script setup>
import { computed, onMounted, ref } from "vue";
import Icon from "../../components/Icon.vue";
import ListSearch from "../../components/ListSearch.vue";
import { financeApi } from "../../api/endpoints";
import { linesWithPayment, PAY_MARK } from "../../utils/invoiceLines";
import { feeIconForText } from "../../utils/feeTypes";
import { matchesSearch } from "../../utils/listSearch";
import { useFeedback } from "../../composables/useFeedback";


const QUARTER_MONTHS = [
  "January–March",
  "April–June",
  "July–September",
  "October–December",
];

const invoices = ref([]);
const query = ref("");
const { error } = useFeedback();
const expanded = ref({});

onMounted(async () => {
  try {
    invoices.value = await financeApi.myInvoices();
  } catch (e) {
    error.value = e.message;
  }
});

const openInvoices = computed(() =>
  invoices.value.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED"),
);

const outstanding = computed(() =>
  invoices.value.reduce((sum, i) => sum + Number(i.balance || 0), 0),
);

const now = new Date();
const currentSort = now.getFullYear() * 10 + Math.floor(now.getMonth() / 3) + 1;

const quarters = computed(() => {
  const groups = new Map();
  for (const invoice of invoices.value) {
    const meta = quarterOf(invoice);
    if (!matchesSearch(
      query.value,
      invoice.invoiceNumber,
      invoice.status,
      invoice.studentName,
      invoice.totalAmount,
      invoice.balance,
      invoice.academicYearName,
      meta.title,
      meta.range,
    )) {
      continue;
    }
    if (!groups.has(meta.key)) {
      groups.set(meta.key, {
        ...meta,
        invoices: [],
      });
    }
    groups.get(meta.key).invoices.push(invoice);
  }
  return [...groups.values()]
    .map((group) => {
      const sorted = [...group.invoices].sort(byNewest);
      const invoiced = sumField(sorted, "totalAmount");
      const paid = sumField(sorted, "paidAmount");
      const balance = sumField(sorted, "balance");
      return {
        ...group,
        invoices: sorted,
        invoiced,
        paid,
        balance,
        current: group.sortKey === currentSort,
        past: group.sortKey > 0 && group.sortKey < currentSort,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);
});

function quarterOf(invoice) {
  const yearName = invoice.academicYearName || "";
  const billed = Number(invoice.billingQuarter);
  if (billed >= 1 && billed <= 4) {
    const date = invoiceDate(invoice);
    const year = date?.getFullYear() || now.getFullYear();
    return {
      key: `${invoice.academicYearId || "na"}-BQ${billed}`,
      sortKey: year * 10 + billed,
      title: `Q${billed} ${year}`,
      range: QUARTER_MONTHS[billed - 1],
      yearName: yearName || String(year),
    };
  }
  const date = invoiceDate(invoice);
  if (!date) {
    return {
      key: `unscheduled-${invoice.academicYearId || "na"}`,
      sortKey: 0,
      title: "Unscheduled",
      range: "No due date",
      yearName,
    };
  }
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return {
    key: `${invoice.academicYearId || "na"}-${year}-Q${quarter}`,
    sortKey: year * 10 + quarter,
    title: `Q${quarter} ${year}`,
    range: QUARTER_MONTHS[quarter - 1],
    yearName: yearName || String(year),
  };
}

function invoiceDate(invoice) {
  const raw = invoice.dueDate || invoice.issuedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function byNewest(a, b) {
  const da = invoiceDate(a)?.getTime() || 0;
  const db = invoiceDate(b)?.getTime() || 0;
  return db - da;
}

function sumField(rows, field) {
  return rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
}

function tzs(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toLocaleString("en-TZ", { maximumFractionDigits: 0 })} TZS`;
}

function fmtDate(raw) {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusChip(status) {
  if (status === "PAID") return "chip";
  if (status === "OVERDUE") return "chip chip-warn";
  if (status === "PARTIAL") return "chip chip-gold";
  if (status === "CANCELLED") return "chip chip-mag";
  return "chip";
}

function toggle(id) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] };
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h1>Invoices</h1>
        <p class="sub">All fees billed to you, grouped by quarter — current and past</p>
      </div>
      <ListSearch v-model="query" placeholder="Search invoices" />
    </div>
    <div class="grid grid-3">
      <article class="glass stat">
        <small>Outstanding</small>
        <strong>{{ tzs(outstanding) }}</strong>
      </article>
      <article class="glass stat">
        <small>Open invoices</small>
        <strong>{{ openInvoices.length }}</strong>
      </article>
      <article class="glass stat">
        <small>All invoices</small>
        <strong>{{ invoices.length }}</strong>
      </article>
    </div>
    <p v-if="!error && !quarters.length" class="empty glass card">{{ query.trim() ? "No invoices match that search." : "No invoices yet." }}</p>
    <article v-for="q in quarters" :key="q.key" class="glass card quarter">
      <header class="quarter-head">
        <div>
          <h2>{{ q.title }}</h2>
          <p class="sub">{{ q.range }}<template v-if="q.yearName"> · {{ q.yearName }}</template></p>
        </div>
        <div class="quarter-meta">
          <span v-if="q.current" class="chip">Current</span>
          <span v-else-if="q.past" class="chip chip-gold">Past</span>
          <strong>{{ tzs(q.balance) }}</strong>
        </div>
      </header>
      <p class="quarter-totals">
        Invoiced {{ tzs(q.invoiced) }} · Paid {{ tzs(q.paid) }} · {{ q.invoices.length }}
        {{ q.invoices.length === 1 ? "invoice" : "invoices" }}
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Due</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="i in q.invoices" :key="i.id">
              <tr class="invoice-row" @click="toggle(i.id)">
                <td>
                  <strong>{{ i.invoiceNumber }}</strong>
                  <small v-if="i.items?.length" class="item-hint">{{ i.items.length }} items</small>
                </td>
                <td>{{ fmtDate(i.dueDate) }}</td>
                <td>{{ tzs(i.totalAmount) }}</td>
                <td>{{ tzs(i.paidAmount) }}</td>
                <td>{{ tzs(i.balance) }}</td>
                <td><span :class="statusChip(i.status)">{{ i.status }}</span></td>
              </tr>
              <tr v-if="expanded[i.id] && i.items?.length" class="items-row">
                <td colspan="6">
                  <ul class="items">
                    <li v-for="item in linesWithPayment(i)" :key="item.id">
                      <span class="pay-mark" :class="`pay-${item.payState}`" :title="PAY_MARK[item.payState].label">
                        <Icon :name="PAY_MARK[item.payState].icon" />
                      </span>
                      <span class="line-label">
                        <Icon :name="feeIconForText(item.description)" />
                        {{ item.description }}
                      </span>
                      <span>{{ tzs(item.amount) }}</span>
                    </li>
                  </ul>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped>
.stat {
  color: inherit;
  text-decoration: none;
}
.quarter-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.quarter-head h2 {
  margin: 0;
  font-size: 1.25rem;
}
.quarter-meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.quarter-totals {
  color: var(--muted);
  font-size: 0.86rem;
  margin: 0.55rem 0 0.9rem;
}
.invoice-row {
  cursor: pointer;
}
.item-hint {
  display: block;
  color: var(--muted);
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.items {
  margin: 0;
  padding: 0.2rem 0 0.6rem;
  list-style: none;
}
.items li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.35rem 0;
  color: var(--muted);
  font-size: 0.86rem;
}
.items li span:nth-child(2) { flex: 1; }
.line-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.line-label .ico { color: #f5c451; }
.pay-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 999px;
  flex: 0 0 auto;
}
.pay-paid { color: #17310f; background: #b6e7a3; }
.pay-partial { color: #4a3208; background: #f5c451; }
.pay-unpaid { color: #f3c1c1; background: transparent; box-shadow: inset 0 0 0 1.5px #c45c5c; }
.items-row td {
  background: rgba(255, 255, 255, 0.02);
  white-space: normal;
}
</style>
