import { fetch } from "@tauri-apps/plugin-http";
import { carousel } from "./components/carousel";

import { categorie, anime_data, anime } from "./types";

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

async function get_mylist() {
  const list = await (
    await fetch("http://animenetwork.org/get-list", {
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    })
  ).json();

  if (!list.length) {
    return {};
  }

  const watched_list: anime_data[] = [];

  // Use Promise.all to wait for all async operations
  await Promise.all(
    list.map(async (anime: anime) => {
      const html = new DOMParser().parseFromString(
        await (await fetch(`https://aniworld.to${anime.series_id}`)).text(),
        "text/html",
      );

      const redirect = anime.series_id;
      const image = html
        .querySelector(".seriesCoverBox img")
        ?.getAttribute("data-src");
      const title = html.querySelector(".series-title h1")?.textContent;

      watched_list.push({
        redirect: redirect || "",
        image: image || "",
        title: title || "",
      });
    }),
  );

  const mylist = {
    label: "My List",
    items: watched_list,
  };

  return mylist;
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
      if (localStorage.getItem("token")) {
        const mylist = await get_mylist();
        localStorage.setItem(
          "mylist",
          JSON.stringify({ mylist: mylist, timestamp: Date.now() }),
        );
      }
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

  const render = () => {
    if (content == null) return;
    content.innerHTML = "";
    let categories =
      JSON.parse(localStorage.getItem("categories") || "").categories || [];
    if (localStorage.getItem("token")) {
      const mylist = JSON.parse(localStorage.getItem("mylist") || "").mylist;
      if (mylist.items && mylist.items.length !== 0) {
        mylist.items.sort(function (a: anime_data, b: anime_data) {
          if (a.title < b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
          return 0;
        });

        categories = [mylist, ...categories];
      }
    }

    categories.forEach((categorie: categorie) => {
      if (content == null || watch_callback == null) return;
      carousel(categorie, content, watch_callback, mylist_handler);
    });
  };

  async function mylist_handler(method: string, data?: anime_data) {
    let storage = null;
    let current = null;
    if (localStorage.getItem("mylist")) {
      storage = JSON.parse(localStorage.getItem("mylist") || "");
      current = storage.mylist.items;
    }

    if (method == "add") {
      current.push(data);
    } else if (method == "rm") {
      const index = current.findIndex(
        (a: anime_data) => a.redirect == data?.redirect,
      );
      if (!index) return;

      current.splice(index, 1);
    } else if (method == "update") {
      const mylist = await get_mylist();
      localStorage.setItem(
        "mylist",
        JSON.stringify({ mylist: mylist, timestamp: Date.now() }),
      );
    }

    if (method !== "update") {
      localStorage.setItem("mylist", JSON.stringify(storage));
    }

    render();
  }

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
    mylist_handler: mylist_handler,
  };
}

export default home_constructor;
