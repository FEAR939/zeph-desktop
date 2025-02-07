import createState from "../createstate";

export function Navbar(contentArea: HTMLElement, navs: Array<object>) {
  const [getShow, setShow, subscribeShow] = createState(false);
  const node = document.createElement("div");
  node.className =
    "absolute z-20 h-full w-64 p-4 pt-16 bg-neutral-950 border-r border-neutral-800 -left-64 transition duration-300";

  navs.map((nav) => {
    const nav_node = document.createElement("div");
    nav_node.className =
      "w-full p-2 hover:bg-neutral-800 flex items-center space-x-4 rounded-md transition-colors cursor-pointer";
    nav_node.innerHTML = `<img src="${nav.icon}" class="h-6 w-6" /><span>${nav.label}</span>`;

    node.appendChild(nav_node);

    nav_node.addEventListener("click", () => nav.fn());
  });

  document.body.appendChild(node);

  subscribeShow((newShow) => {
    if (newShow) {
      node.style.transform = "translateX(100%)";
    } else {
      node.style.transform = "translateX(0)";
    }
  });

  return {
    getShow: getShow,
    setShow: (value) => setShow(value),
  };
}
