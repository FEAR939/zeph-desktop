import { fetch } from "@tauri-apps/plugin-http";

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
      createState(null);

    const pagination = [];

    const selectedWrapper = document.createElement("div");
    selectedWrapper.className = "m-4 p-1 w-fit flex bg-neutral-800 rounded-md";

    categories.map((categorie, i) => {
      pagination.push({
        page: 0,
      });

      const selectedCategorie = document.createElement("div");
      selectedCategorie.className =
        "px-3 py-1.5 rounded cursor-pointer transition duration-300 text-sm text-neutral-400 font-medium";
      selectedCategorie.textContent = categorie.label;

      selectedWrapper.appendChild(selectedCategorie);

      subscribeSelectedList((newList) => {
        if (newList == i) {
          selectedCategorie.classList.remove("text-neutral-400");
          selectedCategorie.classList.add("bg-neutral-950", "text-white");
        } else {
          selectedCategorie.classList.add("text-neutral-400");
          selectedCategorie.classList.remove("bg-neutral-950", "text-white");
        }
      });

      selectedCategorie.addEventListener("click", () => setSelectedList(i));
    });

    content.appendChild(selectedWrapper);

    const itemGrid = document.createElement("div");
    itemGrid.className = "px-4 pb-4 h-fit w-full grid gap-x-4 gap-y-8";

    function handleGridSize(size) {
      itemGrid.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    }

    window.addEventListener("resize", () => {
      handleGridSize(Math.floor(window.outerWidth / 250));
    });

    handleGridSize(Math.floor(window.outerWidth / 250));

    content.appendChild(itemGrid);

    async function handleItems() {
      const items = await get_item_batch(pagination[getSelectedList()].page);
      if (items == null) return;

      categories[getSelectedList()].items = [
        ...categories[getSelectedList()].items,
        ...items,
      ];

      items.map((item) => {
        card(item, itemGrid, watch_callback);
      });

      pagination[getSelectedList()].page += 1;
    }

    subscribeSelectedList(async (newList) => {
      itemGrid.innerHTML = "";
      if (
        pagination[newList].page == 0 &&
        categories[newList].label == "My List"
      ) {
        while (
          content?.clientHeight >
          content?.scrollHeight - selectedWrapper.clientHeight
        ) {
          await handleItems();
        }
      } else {
        categories[newList].items.map((item) => {
          card(item, itemGrid, watch_callback);
        });
      }
    });

    content.addEventListener("scrollend", async () => {
      if (
        getSelectedList() == null ||
        categories[getSelectedList()].label !== "My List"
      )
        return;

      handleItems();
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
