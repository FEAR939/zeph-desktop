import createState from "./createstate";

interface anime_data {
  redirect: String;
  image: String;
  title: String;
}

function get_categories() {
  return new Promise(async (resolve, reject) => {
    try {
      let response = (await fetch("https://aniworld.to")).text();
      const html = new DOMParser().parseFromString(await response, "text/html");
      const container_nodes = html
        .querySelector(".carousel")
        ?.querySelectorAll(".coverListItem a");

      if (!container_nodes) {
        throw new Error("Error, no container nodes found in Document");
      }

      const categories = <any>[];
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

      resolve(categories);
    } catch (e) {
      console.error(e);
      reject(e); // Pass the error to reject
    }
  });
}

function get_mylist() {
  return new Promise(async (resolve, reject) => {
    const list = await (
      await fetch("http://animenetwork.org/get-list", {
        headers: {
          Authorization: localStorage.getItem("token") || "",
        },
      })
    ).json();

    if (!list.length) {
      resolve({});
      return;
    }

    const watched_list: Array<anime_data> = [];

    // Use Promise.all to wait for all async operations
    await Promise.all(
      list.map(async (anime: any) => {
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

    resolve(mylist);
  });
}

function home_constructor(content: HTMLElement, watch_callback: any) {
  let loading = false;

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
    content.innerHTML = "";
    let categories = JSON.parse(localStorage.getItem("categories") || "") || [];
    if (localStorage.getItem("token")) {
      categories = [
        JSON.parse(localStorage.getItem("mylist") || "").mylist,
        ...categories.categories,
      ];
    }

    categories.forEach((categorie: any) => {
      const [getSliderIndex, setSliderIndex, subscribeSliderIndex] =
        createState(0);

      const maxSliderIndex = Math.ceil(categorie.items.length / 7 - 1);

      const scroll = (container: HTMLElement, direction: any) => {
        if (
          (direction == "left" && getSliderIndex() == 0) ||
          (direction == "right" && getSliderIndex() == maxSliderIndex)
        )
          return;

        direction == "left"
          ? setSliderIndex(getSliderIndex() - 1)
          : setSliderIndex(getSliderIndex() + 1);

        container.style.transform = `translateX(calc(${getSliderIndex()} * -100%))`;
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
        "absolute left-0 top-12 bottom-0 w-7 flex items-center justify-center z-10 bg-black bg-opacity-50 rounded-r-lg hover:bg-opacity-75 transition-all";
      carousel_previous.innerHTML =
        "<img src='../assets/chevron_left_24dp.png' class='h-4 w-4' />";

      categorie_node.appendChild(carousel_previous);

      const carousel_next = document.createElement("button");
      carousel_next.className =
        "absolute right-0 top-12 bottom-0 w-7 flex items-center justify-center z-10 bg-black bg-opacity-50 rounded-l-lg hover:bg-opacity-75 transition-all";
      carousel_next.innerHTML =
        "<img src='../assets/chevron_right_24dp.png' class='h-4 w-4' />";

      categorie_node.appendChild(carousel_next);

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

      categorie.items.forEach((item: any, i: number) => {
        const item_node = document.createElement("div");
        item_node.className =
          "flex items-center justify-center flex-shrink-0 relative";
        item_node.style.width = "calc((100vw - 4rem) / 7)";
        item_node.style.height = "calc(((100vw - 4rem) / 7) * 1.3/1)";

        categorie_carousel.appendChild(item_node);

        const item_hover = document.createElement("div");
        item_hover.className =
          "absolute w-[calc(100%-.5rem)] h-full bg-neutral-800 rounded-lg overflow-hidden hover:z-10 hover:w-[110%] hover:h-[calc(110%+4rem)] transition-all ease-in-out duration-500";

        if ((i + 1) % 7 == 1) {
          item_hover.classList.add("left-[.25rem]");
        } else if ((i + 1) % 7 == 0) {
          item_hover.classList.add("right-[.25rem]");
        }
        item_node.appendChild(item_hover);

        item_hover.addEventListener("click", () =>
          watch_callback(item.redirect),
        );

        const item_image = document.createElement("div");
        item_image.className = "w-full aspect-[1/1.36]";

        item_hover.appendChild(item_image);

        const item_title = document.createElement("h3");
        item_title.className =
          "h-8 font-medium text-sm p-2 text-nowrap w-full truncate";
        item_title.textContent = item.title;

        item_hover.appendChild(item_title);

        const asyncImage = new Image();
        asyncImage.src = `https://aniworld.to${item.image}`;
        asyncImage.className = "w-full h-full object-cover";

        asyncImage.addEventListener("load", () => {
          item_image.appendChild(asyncImage);
        });
      });
    });
  };

  return build;
}

export default home_constructor;
