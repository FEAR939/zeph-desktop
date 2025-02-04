export function Navbar(contentArea: HTMLElement, navs: Array<object>) {
  const node = document.createElement("div");
  node.className =
    "absolute z-30 h-full w-64 p-4 pt-16 bg-neutral-900 -left-64 transition duration-300";

  navs.map((nav) => {
    const nav_node = document.createElement("div");
    nav_node.className = "w-full p-4 hover:bg-neutral-700 rounded-lg";
    nav_node.textContent = nav.label;

    node.appendChild(nav_node);

    nav_node.addEventListener("click", () => nav.fn());
  });

  document.body.appendChild(node);

  node.addEventListener("mouseleave", () => {
    node.style.transform = "translateX(0)";
  });

  const show = () => {
    node.style.transform = "translateX(100%)";
  };

  return {
    show: show,
  };
}
