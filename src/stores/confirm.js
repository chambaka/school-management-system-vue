import { defineStore } from "pinia";

export const useConfirmStore = defineStore("confirm", {
  state: () => ({
    open: false,
    title: "Please confirm",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    danger: false,
    resolver: null,
  }),
  actions: {
    ask(options) {
      if (this.resolver) this.settle(false);
      const spec = typeof options === "string" ? { message: options } : options || {};
      this.title = spec.title || "Please confirm";
      this.message = spec.message || "Do you want to continue?";
      this.danger = Boolean(spec.danger);
      this.confirmLabel = spec.confirmLabel || (this.danger ? "Delete" : "Confirm");
      this.cancelLabel = spec.cancelLabel || "Cancel";
      this.open = true;
      return new Promise((resolve) => {
        this.resolver = resolve;
      });
    },
    settle(ok) {
      this.open = false;
      const resolve = this.resolver;
      this.resolver = null;
      resolve?.(Boolean(ok));
    },
  },
});
