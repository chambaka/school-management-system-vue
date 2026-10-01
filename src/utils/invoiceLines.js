export function linesWithPayment(invoice) {
  let credit = Number(invoice?.paidAmount || 0) + Number(invoice?.discountAmount || 0);
  return (invoice?.items || []).map((item) => {
    const amount = Number(item.amount || 0);
    let payState = "unpaid";
    if (invoice?.status !== "CANCELLED") {
      if (amount <= 0 || credit >= amount - 0.001) {
        payState = "paid";
        credit -= amount;
      } else if (credit > 0.001) {
        payState = "partial";
        credit = 0;
      }
    }
    return { ...item, payState };
  });
}

export const PAY_MARK = {
  paid: { icon: "check", label: "Fully paid" },
  partial: { icon: "partial", label: "Partly paid" },
  unpaid: { icon: "unpaid", label: "Not paid" },
};
