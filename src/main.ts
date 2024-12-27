import home_constructor from "./home_module.js";
import login_constructor from "./login_module.js";
import nav_constructor from "./nav_module.js";
import top_constructor from "./top_module.js";
import watch_constructor from "./watch_module.js";

const top_area = document.createElement("div");
top_area.className = "h-14"
document.body.appendChild(top_area);

const horizontal_layout = document.createElement("div");
horizontal_layout.className = "flex flex-1 overflow-hidden";
document.body.appendChild(horizontal_layout);

const nav_area = document.createElement("div");
nav_area.className = "w-64";
horizontal_layout.appendChild(nav_area);

const content_area = document.createElement("div");
content_area.className = "flex-1 overflow-y-auto";
horizontal_layout.appendChild(content_area);

const routes = [
    { id: "home", label: "Home", icon: "../assets/home_24dp.png", fn: () => home_page() },
]

const watch_page = watch_constructor();
const home_page = home_constructor(content_area, watch_page);
const login_page = login_constructor(content_area, routes);

nav_constructor(nav_area, routes, 0);
top_constructor(top_area, login_page, watch_page);