import { ref, watch } from "vue";
import { useNoticeStore } from "../stores/notice";

export function useFeedback() {
  const notice = useNoticeStore();
  const error = ref("");
  const ok = ref("");
  const warning = ref("");
  const info = ref("");

  watch(error, (msg) => {
    if (msg) notice.error(String(msg));
  });
  watch(ok, (msg) => {
    if (msg) notice.success(String(msg));
  });
  watch(warning, (msg) => {
    if (msg) notice.warning(String(msg));
  });
  watch(info, (msg) => {
    if (msg) notice.info(String(msg));
  });

  return { error, ok, warning, info, notice };
}
