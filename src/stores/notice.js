import { defineStore } from "pinia";

const TITLES = {
  error: "Error",
  warning: "Warning",
  info: "Information",
  success: "Success",
};

export const useNoticeStore = defineStore("notice", {
  state: () => ({
    open: false,
    type: "info",
    title: "",
    message: "",
    queue: [],
    resolver: null,
  }),
  actions: {
    show(options) {
      const spec = typeof options === "string" ? { message: options } : options || {};
      const item = {
        type: spec.type || "info",
        title: spec.title || TITLES[spec.type] || TITLES.info,
        message: String(spec.message || "").trim(),
      };
      if (!item.message) return Promise.resolve();
      if (this.open) {
        return new Promise((resolve) => {
          this.queue.push({ item, resolve });
        });
      }
      return this.present(item);
    },
    error(message, title) {
      return this.show({ type: "error", message, title });
    },
    warning(message, title) {
      return this.show({ type: "warning", message, title });
    },
    info(message, title) {
      return this.show({ type: "info", message, title });
    },
    success(message, title) {
      return this.show({ type: "success", message, title });
    },
    present(item) {
      this.type = item.type;
      this.title = item.title;
      this.message = item.message;
      this.open = true;
      return new Promise((resolve) => {
        this.resolver = resolve;
      });
    },
    close() {
      this.open = false;
      const resolve = this.resolver;
      this.resolver = null;
      resolve?.();
      const next = this.queue.shift();
      if (next) {
        queueMicrotask(() => {
          this.present(next.item).then(next.resolve);
        });
      }
    },
  },
});
