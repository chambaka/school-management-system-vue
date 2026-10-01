export const ACCOUNTANT_FINANCE_HOME = "/finance/fees/structures";

export const accountantFinanceMenu = [
  {
    label: "Fees",
    children: [
      { to: "/finance/fees/structures", label: "Fee structures", section: "fee-structures" },
    ],
  },
  { to: "/finance/invoices", label: "Invoices", section: "invoices" },
  {
    label: "Payments",
    children: [
      { to: "/finance/payments/record", label: "Record payment", section: "record-payment" },
      { to: "/finance/payments/discount", label: "Discount", section: "discount" },
    ],
  },
  { to: "/finance/ledger", label: "Student Ledger", section: "ledger" },
];

export const financeSectionMeta = {
  all: { title: "Finance", sub: "Fees, ledger, receipts" },
  "fee-structures": {
    title: "Fee structures",
    sub: "Leave class as All to use the same amount for every class. Pick a class to set a different tuition or transport rate for that level.",
  },
  invoices: { title: "Invoices", sub: "Student invoices for the current school." },
  "record-payment": { title: "Record payment", sub: "Apply a payment to a student invoice." },
  discount: { title: "Discount", sub: "Reduce the balance on a student invoice." },
  ledger: { title: "Student Ledger", sub: "Invoiced, discounts, payments, and receipts for one student." },
};
