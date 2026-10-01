import { registerSW } from "virtual:pwa-register";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";
import { useConfigStore } from "./stores/config";
import { useNoticeStore } from "./stores/notice";
import { installConfirm } from "./plugins/confirm";
import "./assets/styles.css";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

const auth = useAuthStore();
auth.hydrate();
await useConfigStore().bootstrap();

app.use(router);
installConfirm(app);
app.config.errorHandler = (err) => {
  console.error(err);
  useNoticeStore().error(err?.message || "Something went wrong");
};
registerSW({ immediate: true });
app.mount("#app");
