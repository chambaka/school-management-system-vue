import { useConfirmStore } from "../stores/confirm";

function specFrom(value, el) {
  const raw = typeof value === "function" ? value() : value;
  if (typeof raw === "string") {
    return { message: raw, danger: el.classList.contains("btn-danger") };
  }
  return {
    message: raw?.message || "Do you want to continue?",
    title: raw?.title,
    danger: raw?.danger ?? el.classList.contains("btn-danger"),
    confirmLabel: raw?.confirmLabel,
    cancelLabel: raw?.cancelLabel,
  };
}

export function installConfirm(app) {
  app.directive("confirm", {
    mounted(el, binding) {
      el.__haloConfirmValue = binding.value;
      const onClick = async (event) => {
        if (el.dataset.confirmOk === "1") {
          delete el.dataset.confirmOk;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const ok = await useConfirmStore().ask(specFrom(el.__haloConfirmValue, el));
        if (!ok) return;
        el.dataset.confirmOk = "1";
        el.click();
      };
      el.__haloConfirm = onClick;
      el.addEventListener("click", onClick, true);
    },
    updated(el, binding) {
      el.__haloConfirmValue = binding.value;
    },
    unmounted(el) {
      if (el.__haloConfirm) el.removeEventListener("click", el.__haloConfirm, true);
    },
  });

  if (document.__haloConfirmSubmit) return;
  document.__haloConfirmSubmit = true;
  document.addEventListener(
    "submit",
    async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.hasAttribute("data-no-confirm")) return;
      if (event.submitter?.type === "button") return;
      if (form.dataset.confirmOk === "1") {
        delete form.dataset.confirmOk;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const button = form.querySelector("button.btn:not([type=button]):not(.btn-ghost)");
      const label = (button?.textContent || "this action").replace(/\s+/g, " ").trim();
      const message = form.getAttribute("data-confirm") || `${label}?`;
      const ok = await useConfirmStore().ask({
        message,
        danger: form.hasAttribute("data-confirm-danger"),
      });
      if (!ok) return;
      form.dataset.confirmOk = "1";
      if (typeof form.requestSubmit === "function") {
        if (button && !button.disabled) form.requestSubmit(button);
        else form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    },
    true,
  );
}
