import { registerSW } from "virtual:pwa-register";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";
import { useConfigStore } from "./stores/config";
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
registerSW({ immediate: true });
app.mount("#app");
