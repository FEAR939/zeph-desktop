import createState from "./createstate.js";
import home_constructor from "./home_module.js";
import auth_constructor from "./auth_module.js";
import top_constructor from "./top_module.js";
import watch_constructor from "./watch_module.js";

const [getUser, setUser, subscribeUser] = createState<object | null>(null);

async function login(token?: string) {
  if (!localStorage.getItem("token") && typeof token !== "undefined") {
    localStorage.setItem("token", token);
  } else if (!localStorage.getItem("token")) {
    return;
  }

  const json = await (
    await fetch("http://animenetwork.org/get-user", {
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    })
  ).json();

  setUser(json);
}

const top_area = document.createElement("div");
top_area.className =
  "absolute z-30 top-0 left-0 right-0 h-14 bg-gradient-to-t from-transparent via-bg-[#090b0c]/60 to-[#090b0c]";
document.body.appendChild(top_area);

const content_area = document.createElement("div");
content_area.className =
  "absolute inset-0 pt-12 overflow-y-auto overflow-hidden";
document.body.appendChild(content_area);

const home_page = home_constructor();
const watch_page = watch_constructor();
const auth_page = auth_constructor(subscribeUser);

const top_bar = top_constructor(
  top_area,
  auth_page.build,
  watch_page.build,
  subscribeUser,
);

home_page.setParams(content_area, watch_page.build);
watch_page.setParams(home_page.mylist_handler, top_bar.current_handler);
auth_page.setParams(content_area, home_page.mylist_handler, login);

top_bar.render();
home_page.build();

login();
