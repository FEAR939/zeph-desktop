import home_constructor from "./home_module.js";
import login_constructor from "./login_module.js";
import top_constructor from "./top_module.js";
import watch_constructor from "./watch_module.js";

// const glow_blob = document.createElement("div");
// glow_blob.className =
//   "absolute -z-10 h-96 w-96 bg-blue-400 rounded-full blur-3xl";

// document.body.appendChild(glow_blob);

// window.addEventListener("mousemove", (e: MouseEvent) => {
//   setTimeout(() => {
//     glow_blob.style.transform = `translate3D(${e.clientX - glow_blob.offsetWidth / 2}px, ${e.clientY - glow_blob.offsetWidth / 2}px, 0)`;
//   }, 200);
// });

// const blur_bg = document.createElement("div");
// blur_bg.className = "absolute -z-5 h-full w-full bg-[#090b0c]/15";

// document.body.appendChild(blur_bg);

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
const login_page = login_constructor();

const top_bar = top_constructor(top_area, login_page.build, watch_page.build);

home_page.setParams(content_area, watch_page.build);
watch_page.setParams(home_page.mylist_handler, top_bar.current_handler);
login_page.setParams(content_area, home_page.mylist_handler);

top_bar.render();
home_page.build();
