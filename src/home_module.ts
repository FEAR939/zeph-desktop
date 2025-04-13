import { fetch } from "@tauri-apps/plugin-http";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { categorie, anime_data, anime } from "./types";
import createState from "./createstate";
import { card } from "./components/card";

async function get_categories() {
  try {
    const response = (await fetch("https://aniworld.to")).text();
    const html = new DOMParser().parseFromString(await response, "text/html");
    const container_nodes = html
      .querySelector(".carousel")
      ?.querySelectorAll(".coverListItem a");

    if (!container_nodes) {
      throw new Error("Error, no container nodes found in Document");
    }

    const categories: categorie[] = [];
    const trending: Array<anime_data> = [];

    container_nodes.forEach((node) => {
      const redirect = node.getAttribute("href");
      const image = node
        .querySelector("img")
        ?.getAttribute("data-src")
        ?.replace("150x225", "220x330");
      const title = node.querySelector("h3")?.textContent?.trim();

      trending.push({
        redirect: redirect || "",
        image: image || "",
        title: title || "",
      });
    });

    categories.push({
      label: "Trending Now",
      items: trending,
    });

    return categories;
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function get_item_batch(page: number) {
  const items = await (
    await fetch(`${localStorage.getItem("api_url")}/get-list?page=${page}`, {
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    })
  ).json();

  if (!items.length) {
    return null;
  }

  const items_list: anime_data[] = [];

  // Use Promise.all to wait for all async operations
  await Promise.all(
    items.map(async (anime: anime) => {
      const redirect = anime.series_id;
      let image = "";
      let title = "";
      const serverData = await fetch(
        `${localStorage.getItem("api_url")}/get-anime`,
        {
          method: "POST",
          body: redirect,
        },
      );

      if (serverData.status == 404) {
        const html = new DOMParser().parseFromString(
          await (await fetch(`https://aniworld.to${anime.series_id}`)).text(),
          "text/html",
        );

        image =
          html.querySelector(".seriesCoverBox img")?.getAttribute("data-src") ||
          "";
        title = html.querySelector(".series-title h1")?.textContent || "";

        if (image.length !== 0 && title.length !== 0) {
          await fetch(`${localStorage.getItem("api_url")}/set-anime`, {
            method: "POST",
            body: JSON.stringify({
              redirect: redirect,
              image: image,
              title: title,
            }),
          });
        }
      } else {
        const data = await serverData.json();

        image = data.image;
        title = data.title;
      }

      items_list.push({
        redirect: redirect || "",
        image: image || "",
        title: title || "",
      });
    }),
  );

  items_list.sort((a, b) => {
    if (a.title < b.title) {
      return -1;
    }
    if (a.title > b.title) {
      return 1;
    }
    return 0;
  });

  return items_list;
}

function home_constructor() {
  let loading: boolean = false;
  let content: HTMLElement | null = null;
  let watch_callback: ((redirect: string) => void) | null = null;

  const build = async () => {
    if (loading) return;

    async function caching() {
      loading = true;
      console.log("INFO: building cache");

      const categories = await get_categories();
      localStorage.setItem(
        "categories",
        JSON.stringify({ categories: categories, timestamp: Date.now() }),
      );
      loading = false;
    }

    if (!localStorage.getItem("categories")) {
      await caching();
    } else if (
      (Date.now() -
        JSON.parse(localStorage.getItem("categories") || "").timestamp) /
        1000 >
      3600
    ) {
      console.log("INFO: cache older than an hour, refreshing");
      await caching();
    }

    console.log("INFO: cache loaded");

    render();
  };

  const render = async () => {
    const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
    if (content == null) return;
    content.innerHTML = "";
    let categories =
      JSON.parse(localStorage.getItem("categories") || "").categories || [];
    if (localStorage.getItem("token")) {
      const mylist = {
        label: "My List",
        items: [],
      };

      categories = [...categories, mylist];
    }

    const [getSelectedList, setSelectedList, subscribeSelectedList] =
      createState<null | number>(null);

    type Page = {
      page: number;
    };

    const pagination: Page[] = [];

    const selectedWrapper = document.createElement("div");
    selectedWrapper.className = "m-4 flex-1 flex flex-wrap gap-x-2 gap-y-2";

    type Category = {
      label: string;
    };

    categories.map((categorie: Category, i: number) => {
      pagination.push({
        page: 0,
      });

      const selectedCategorie = document.createElement("div");
      selectedCategorie.className =
        "w-full px-3 py-2 flex items-center hover:brightness-80 rounded-full cursor-pointer transition duration-300 text-sm font-medium space-x-4 md:w-fit";
      switch (categorie.label) {
        case "Trending Now":
          selectedCategorie.innerHTML = `<div>${categorie.label}</div>`;
          break;
        case "My List":
          selectedCategorie.innerHTML = `<div>${categorie.label}</div>`;
          break;
      }

      selectedWrapper.appendChild(selectedCategorie);

      subscribeSelectedList((newList) => {
        if (newList == i) {
          selectedCategorie.classList.add(
            "bg-gradient-to-r",
            "from-[rgb(54,95,215)]",
            "to-[rgb(143,155,215)]",
          );
        } else {
          selectedCategorie.classList.remove(
            "bg-gradient-to-r",
            "from-[rgb(54,95,215)]",
            "to-[rgb(143,155,215)]",
          );
        }
      });

      selectedCategorie.addEventListener("click", () => setSelectedList(i));
    });

    content.appendChild(selectedWrapper);

    const selectedHeader = document.createElement("div");
    selectedHeader.className = "ml-4 mb-4 text-xl text-white";

    content.appendChild(selectedHeader);

    const itemGrid = document.createElement("div");
    itemGrid.className = "px-4 pb-4 h-fit w-full grid gap-x-2 gap-y-4";

    function handleGridSize(size: number) {
      itemGrid.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    }

    if (!isMobileDevice) {
      getCurrentWindow().listen("tauri://resize", () => {
        handleGridSize(Math.floor(window.outerWidth / 200));
      });

      handleGridSize(Math.floor(window.outerWidth / 200));
    } else {
      handleGridSize(2);
    }

    content.appendChild(itemGrid);

    const pageSelector = document.createElement("div");
    pageSelector.className = "h-8 w-full flex justify-center items-center mb-2";
    pageSelector.style.display = "none";

    content.appendChild(pageSelector);

    const pagePrev = document.createElement("img");
    pagePrev.src = "/icons/chevron_left_24dp.png";
    pagePrev.className = "w-6 h-6 mr-2 cursor-pointer";
    pagePrev.addEventListener("click", () => {
      const selected = getSelectedList();
      if (selected == null) return;
      if (pagination[selected].page > 0) {
        pagination[selected].page -= 1;
        handleItems();
      }
    });

    pageSelector.appendChild(pagePrev);

    const pageCurrent = document.createElement("span");
    pageCurrent.className =
      "text-base px-2 py-0.5 mr-2 bg-[rgb(18,18,18)] outline outline-[hsla(0,0%,100%,0.15)] rounded-lg";
    const selected = getSelectedList() || 0;
    pageCurrent.textContent = `${pagination[selected].page}`;

    pageSelector.appendChild(pageCurrent);

    const pageNext = document.createElement("img");
    pageNext.src = "/icons/chevron_right_24dp.png";
    pageNext.className = "w-6 h-6 cursor-pointer";
    pageNext.addEventListener("click", () => {
      const selected = getSelectedList();
      if (selected == null) return;
      pagination[selected].page += 1;
      handleItems();
    });

    pageSelector.appendChild(pageNext);

    async function handleItems() {
      const selected = getSelectedList();
      if (selected == null) return;
      const items = await get_item_batch(pagination[selected].page);
      if (items == null) return (pagination[selected].page -= 1);

      categories[selected].items = [...categories[selected].items, ...items];

      itemGrid.innerHTML = "";
      if (!content) return;
      content.scrollTo(0, 0);

      items.map((item) => {
        card(item, itemGrid, watch_callback || (() => {}));
      });

      pageCurrent.textContent = `${pagination[selected].page + 1}`;
    }

    subscribeSelectedList(async (newList) => {
      if (newList == null) return;
      itemGrid.innerHTML = "";
      selectedHeader.textContent = categories[newList].label;
      if (
        pagination[newList].page == 0 &&
        categories[newList].label == "My List"
      ) {
        pageSelector.style.display = "flex";
        await handleItems();
      } else if (categories[newList].label == "My List") {
        pageSelector.style.display = "flex";
        await handleItems();
      } else {
        pageSelector.style.display = "none";
        categories[newList].items.map((item: anime_data) => {
          card(item, itemGrid, watch_callback || (() => {}));
        });
      }
    });

    setSelectedList(0);
  };

  const setParams = (
    area: HTMLElement,
    w_callback: (url: string) => Promise<void>,
  ) => {
    content = area;
    watch_callback = w_callback;
  };

  return {
    build: build,
    setParams: setParams,
  };
}

export default home_constructor;
