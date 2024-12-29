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

const home_page = home_constructor();
const watch_page = watch_constructor();
const login_page = login_constructor();

home_page.setParams(content_area, watch_page.build);
watch_page.setParams(home_page.mylist_handler);
login_page.setParams(content_area, home_page.mylist_handler);

top_constructor(top_area, login_page.build, watch_page.build);

home_page.build();
