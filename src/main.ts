import createState from "./createstate.js";
import home_constructor from "./home_module.js";
import auth_constructor from "./auth_module.js";
import top_constructor from "./top_module.js";
import watch_constructor from "./watch_module.js";
import { Settings } from "./settings.js";
import { fetch } from "@tauri-apps/plugin-http";

localStorage.setItem("api_url", "https://animenetwork.org:5000");

const [getUser, setUser, subscribeUser] = createState<object | null>(null);

async function login(token?: string) {
  if (!localStorage.getItem("token") && typeof token !== "undefined") {
    localStorage.setItem("token", token);
  } else if (!localStorage.getItem("token")) {
    return;
  }

  const json = await (
    await fetch(`${localStorage.getItem("api_url")}/get-user`, {
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    })
  ).json();

  setUser(json);
}

const top_area = document.createElement("div");
top_area.className = "absolute z-30 top-0 left-0 right-0 h-14 bg-neutral-950";
document.body.appendChild(top_area);

const content_area = document.createElement("div");
content_area.className =
  "absolute inset-0 pt-14 overflow-y-auto overflow-hidden";
document.body.appendChild(content_area);

const home_page = home_constructor();
const watch_page = watch_constructor();
const auth_page = auth_constructor(subscribeUser);

const settings_page = Settings(
  {
    get: getUser,
    set: (value) => setUser(value),
    subscribe: subscribeUser,
  },
  auth_page.build,
);

const top_bar = top_constructor(
  top_area,
  auth_page.build,
  watch_page.build,
  subscribeUser,
  {
    get: getUser,
    set: (value) => setUser(value),
    subscribe: subscribeUser,
  },
  settings_page,
);

home_page.setParams(content_area, watch_page.build);
watch_page.setParams(top_bar.current_handler);
auth_page.setParams(content_area, home_page.build, login);

top_bar.render();
home_page.build();

login();
