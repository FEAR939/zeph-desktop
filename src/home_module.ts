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

      if (localStorage.getItem("token")) {
        const list = await (
          await fetch("http://animenetwork.org/get-list", {
            headers: {
              Authorization: localStorage.getItem("token") || "",
            },
          })
        ).json();

        if (!list.length) {
          resolve(categories);
          return;
        }

        const watched_list: Array<anime_data> = [];

        // Use Promise.all to wait for all async operations
        await Promise.all(
          list.map(async (anime: any) => {
            const html = new DOMParser().parseFromString(
              await (
                await fetch(`https://aniworld.to${anime.series_id}`)
              ).text(),
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

        categories.push({
          label: "My List",
          items: watched_list,
        });
      }

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

function home_constructor(content: HTMLElement, watch_callback: any) {
  let cache = new Map<String, any>();
  let loading = false;

  const build = async () => {
    if (loading) return;

    if (cache.size == 0) {
      loading = true;
      console.log("INFO: building cache");
      const categories = await get_categories();
      cache.set("categories", categories);
      loading = false;
    } else {
      console.log("INFO: reusing cache");
    }

    console.log("INFO: cache loaded");
    console.log(cache);

    render();
  };

  const render = () => {
    content.innerHTML = "";
    const categories = cache.get("categories");

    categories.forEach((categorie: any) => {
      const scroll = (container: HTMLElement, direction: any) => {
        const scrollAmount =
          direction === "left"
            ? -(container.offsetWidth - 15)
            : container.offsetWidth - 15;
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      };

      const categorie_node = document.createElement("div");
      categorie_node.className = "relative mt-4";

      content.appendChild(categorie_node);

      const categorie_label = document.createElement("h2");
      categorie_label.className = "text-xl font-bold px-4 mb-4";
      categorie_label.textContent = categorie.label;

      categorie_node.appendChild(categorie_label);

      const carousel_previous = document.createElement("button");
      carousel_previous.className =
        "absolute left-0 top-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full transform -translate-y-1/2 hover:bg-opacity-75 transition-all ml-2";
      carousel_previous.innerHTML =
        "<img src='../assets/chevron_left_24dp.png' class='h-4 w-4' />";

      categorie_node.appendChild(carousel_previous);

      const carousel_next = document.createElement("button");
      carousel_next.className =
        "absolute right-0 top-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full transform -translate-y-1/2 hover:bg-opacity-75 transition-all mr-2";
      carousel_next.innerHTML =
        "<img src='../assets/chevron_right_24dp.png' class='h-4 w-4' />";

      categorie_node.appendChild(carousel_next);

      const categorie_carousel = document.createElement("div");
      categorie_carousel.className =
        "flex space-x-4 overflow-x-hidden px-4 scroll-smooth";

      categorie_node.appendChild(categorie_carousel);

      carousel_previous.addEventListener("click", () =>
        scroll(categorie_carousel, "left"),
      );
      carousel_next.addEventListener("click", () =>
        scroll(categorie_carousel, "right"),
      );

      categorie.items.forEach((item: any) => {
        const item_node = document.createElement("div");
        item_node.className = "flex-shrink-0";
        item_node.style.width = "calc((100% - (6 * 1rem)) / 7)";

        item_node.addEventListener("click", () =>
          watch_callback(item.redirect),
        );

        categorie_carousel.appendChild(item_node);

        const item_image = document.createElement("div");
        item_image.className = "aspect-[1/1.3]";

        item_node.appendChild(item_image);

        const item_title = document.createElement("h3");
        item_title.className =
          "font-medium text-sm mt-2 text-nowrap w-full truncate";
        item_title.textContent = item.title;

        item_node.appendChild(item_title);

        const asyncImage = new Image();
        asyncImage.src = `https://aniworld.to${item.image}`;
        asyncImage.className = "w-full h-full object-cover rounded-lg";

        asyncImage.addEventListener("load", () => {
          item_image.appendChild(asyncImage);
        });
      });
    });
  };

  return build;
}

export default home_constructor;
