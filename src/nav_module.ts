import createState from "./createstate.js";

function nav_constructor(parent: HTMLElement, routes: Array<any>, start: any) {
  console.log("INFO: building navigation");

  const nav_node = document.createElement("div");
  nav_node.className = "h-full w-full p-2";

  parent.appendChild(nav_node);

  console.log("INFO: inserting routes");
  console.log(routes);

  const route_nodes = <any>[];

  routes.forEach((route, i) => {
    const [getActive, setActive, subscribeActive] = createState(false);
    const route_node = document.createElement("div");
    route_node.className =
      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg mb-1";
    route_node.innerHTML = `<img src='${route.icon}' class="h-4 w-4" /><span>${route.label}</span>`;

    nav_node.appendChild(route_node);
    subscribeActive((newActive) => {
      if (newActive) {
        route_node.classList.add("bg-neutral-800");

        route.fn();
      } else {
        route_node.classList.remove("bg-neutral-800");
      }
    });

    if (i == 0) {
      setActive(true);
    }

    route_node.addEventListener("click", () => {
      route_nodes.forEach((node: any) => {
        node.set(false);
      });
      setActive(true);
    });

    route_nodes.push({
      node: route_node,
      get: () => getActive(),
      set: (value: any) => setActive(value),
      subscribe: (callback: any) => subscribeActive(callback),
    });
  });

  console.log("INFO: inserted routes");
  console.log(route_nodes);
}

export default nav_constructor;
