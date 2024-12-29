import home_constructor from "./home_module.js";
import login_constructor from "./login_module.js";
import top_constructor from "./top_module.js";
import watch_constructor from "./watch_module.js";

const top_area = document.createElement("div");
top_area.className = "h-14";
document.body.appendChild(top_area);

const content_area = document.createElement("div");
content_area.className = "flex-1 overflow-y-auto";
document.body.appendChild(content_area);

const watch_page = watch_constructor();
const home_page = home_constructor(content_area, watch_page);
const login_page = login_constructor(content_area, home_page);

top_constructor(top_area, login_page, watch_page);

home_page();
