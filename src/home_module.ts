import { fetch } from "@tauri-apps/plugin-http";
import createState from "./createstate";

type anime_data = {
  redirect: string;
  image: string;
  title: string;
};

type categorie = {
  label: string;
  items: anime_data[];
};

type anime = {
  series_id: string;
};

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
      const image = node.querySelector("img")?.getAttribute("data-src");
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

    categories.forEach((categorie: categorie) => {
      if (content == null) return;
      const [getCardCount, setCardCount, subscribeCardCount] = createState(
        Math.floor(window.innerWidth / 150),
      );

      window.addEventListener("resize", () =>
        setCardCount(Math.floor(window.innerWidth / 150)),
      );

      const [getSliderIndex, setSliderIndex, subscribeSliderIndex] =
        createState(0);

      let maxSliderIndex = Math.ceil(
        categorie.items.length / getCardCount() - 1,
      );

      subscribeCardCount(
        (newCount) =>
          (maxSliderIndex = Math.ceil(categorie.items.length / newCount - 1)),
      );

      const scroll = (container: HTMLElement, direction: string) => {
        if (
          (direction == "left" && getSliderIndex() == 0) ||
          (direction == "right" && getSliderIndex() == maxSliderIndex)
        )
          return;

        if (direction == "left") {
          setSliderIndex(getSliderIndex() - 1);
        } else {
          setSliderIndex(getSliderIndex() + 1);
        }

        container.style.transform = `translate3D(calc(${getSliderIndex()} * -100%), 0, 0)`;
      };

      const categorie_node = document.createElement("div");
      categorie_node.className = "relative mt-4";

      content.appendChild(categorie_node);

      const categorie_label = document.createElement("h2");
      categorie_label.className = "h-8 text-xl font-bold px-10 mb-4";
      categorie_label.textContent = categorie.label;

      categorie_node.appendChild(categorie_label);

      const carousel_previous = document.createElement("button");
      carousel_previous.className =
        "absolute left-0 top-[46px] bottom-[-2px] w-[30px] flex items-center justify-center z-10 bg-black bg-opacity-50 rounded-r-lg hover:bg-opacity-75 transition-all ease-in-out duration-300";
      carousel_previous.innerHTML =
        "<img src='./icons/chevron_left_24dp.png' class='h-4 w-4' />";
      carousel_previous.style.opacity = "0";

      categorie_node.appendChild(carousel_previous);

      const carousel_next = document.createElement("button");
      carousel_next.className =
        "absolute right-0 top-[46px] bottom-[-2px] w-[30px] flex items-center justify-center z-10 bg-black bg-opacity-50 rounded-l-lg hover:bg-opacity-75 transition-all ease-in-out duration-300";
      carousel_next.innerHTML =
        "<img src='./icons/chevron_right_24dp.png' class='h-4 w-4' />";
      carousel_next.style.opacity = "0";

      categorie_node.appendChild(carousel_next);

      const handle_visible = (index: number) => {
        let prevVisible = "0";
        let nextVisible = "0";
        if (index == 0 && index !== maxSliderIndex) {
          nextVisible = "1";
        } else if (index !== 0 && index !== maxSliderIndex) {
          prevVisible = "1";
          nextVisible = "1";
        } else if (index !== 0 && index == maxSliderIndex) {
          prevVisible = "1";
        }

        carousel_previous.style.opacity = prevVisible;
        carousel_next.style.opacity = nextVisible;
      };

      handle_visible(getSliderIndex());

      subscribeSliderIndex((newIndex) => {
        handle_visible(newIndex);
      });

      subscribeCardCount(() => {
        handle_visible(getSliderIndex());
      });

      const categorie_carousel = document.createElement("div");
      categorie_carousel.className =
        "flex mx-8 scroll-smooth transition-all ease-in-out duration-500";

      categorie_node.appendChild(categorie_carousel);

      carousel_previous.addEventListener("click", () =>
        scroll(categorie_carousel, "left"),
      );
      carousel_next.addEventListener("click", () =>
        scroll(categorie_carousel, "right"),
      );

      categorie.items.forEach((item: anime_data, i: number) => {
        const item_node = document.createElement("div");
        item_node.className =
          "flex items-center justify-center flex-shrink-0 mx-[.25rem] overflow-hidden rounded-lg";
        item_node.style.width = `calc(((100vw - 4rem) / ${getCardCount()}) - .5rem)`;
        item_node.style.height = `calc(((100vw - 4rem) / ${getCardCount()}) - .5rem) * 1.3/1)`;

        subscribeCardCount((newCount) => {
          item_node.style.width = `calc(((100vw - 4rem) / ${newCount}) - .5rem)`;
          item_node.style.height = `calc(((100vw - 4rem) / ${newCount}) - .5rem) * 1.3/1)`;
        });

        categorie_carousel.appendChild(item_node);

        const item_image = document.createElement("div");
        item_image.className = "w-full aspect-[1/1.3]";

        item_node.appendChild(item_image);

        const asyncImage = new Image();
        asyncImage.src = `https://aniworld.to${item.image}`;
        asyncImage.className = "w-full h-full object-cover";

        asyncImage.addEventListener("load", () => {
          item_image.appendChild(asyncImage);
        });

        item_node.addEventListener("mouseenter", async () => {
          const item_hover = document.createElement("div");
          item_hover.className =
            "absolute bg-neutral-900 rounded-lg overflow-hidden hover:z-20 transition-all ease-in-out duration-500 cursor-pointer";

          const updateSize = () => {
            const itemRect = item_node.getBoundingClientRect();
            item_hover.style.height = `${itemRect.height}px`;
            item_hover.style.width = `${itemRect.width}px`;
            item_hover.style.top = `${itemRect.top}px`;
            item_hover.style.left = `${itemRect.left}px`;
          };
          updateSize();

          window.addEventListener("resize", updateSize);

          let expanded = false;

          item_hover.addEventListener("mouseleave", () => {
            updateSize();
            if (expanded) {
              return setTimeout(() => item_hover.remove(), 500);
            }
            item_hover.remove();
          });

          document.body.appendChild(item_hover);

          const hover_image = item_image.cloneNode(true);
          item_hover.appendChild(hover_image);

          item_hover.addEventListener("click", () => {
            if (watch_callback == null) return;
            watch_callback(item.redirect);
          });

          const item_title = document.createElement("h3");
          item_title.className =
            "h-8 font-medium text-sm p-2 text-nowrap w-full truncate";
          item_title.textContent = item.title;

          item_hover.appendChild(item_title);

          if (localStorage.getItem("token")) {
            const [getList, setList, subscribeList] = createState(0);

            const on_list = document.createElement("div");
            on_list.className =
              "w-fit flex items-center space-x-1 bg-neutral-800 hover:bg-neutral-700 px-1 py-0.5 mx-2 rounded";
            on_list.textContent = "...";
            on_list.id = "on_list";

            item_hover.appendChild(on_list);

            subscribeList((newList) => {
              if (newList == 1) {
                on_list.innerHTML =
                  "<img src='./icons/remove_24dp.png' class='h-2 w-2' /><span class='text-xs'>My List</span>";
              } else {
                on_list.innerHTML =
                  "<img src='./icons/add_24dp.png' class='h-2 w-2' /><span class='text-xs'>My List</span>";
              }
            });

            const mylist = JSON.parse(localStorage.getItem("mylist") || "")
              .mylist.items;

            const index = mylist.findIndex(
              (a: anime_data) => a.redirect == item.redirect,
            );

            if (index !== -1) {
              setList(1);
            } else {
              setList(0);
            }

            on_list.addEventListener("click", async (e) => {
              e.stopPropagation();
              const res = await fetch("http://animenetwork.org/handle-marked", {
                method: "POST",
                headers: {
                  Authorization: localStorage.getItem("token") || "",
                },
                body: item.redirect.toString(),
              });
              if (!res.ok) return;
              mylist_handler(getList() == 0 ? "add" : "rm", {
                redirect: item.redirect,
                image: item.image,
                title: item.title,
              });
              setList(getList() == 0 ? 1 : 0);
            });
          }

          setTimeout(() => {
            expanded = true;
            const itemRect = item_node.getBoundingClientRect();
            item_hover.style.height = `${itemRect.height * 1.1 + 64}px`;
            item_hover.style.width = `${itemRect.width * 1.1}px`;
            if ((i + 1) % 7 == 1) {
              item_hover.style.left = `${itemRect.left}px`;
            } else if ((i + 1) % 7 == 0) {
              item_hover.style.left = `${itemRect.left - itemRect.width * 0.1}px`;
            } else {
              item_hover.style.left = `${itemRect.left - itemRect.width * 0.05}px`;
            }
            item_hover.style.top = `${itemRect.top - itemRect.height * 0.05 - 32}px`;
            item_hover.style.boxShadow = "0 4px 12px 0 rgba(0, 0, 0, 0.75)";
          }, 500);
        });
      });
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
    callback: (url: string) => Promise<void>,
  ) => {
    content = area;
    watch_callback = callback;
  };

  return {
    build: build,
    setParams: setParams,
    mylist_handler: mylist_handler,
  };
}

export default home_constructor;
