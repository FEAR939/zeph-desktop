import createState from "../createstate";
import { fetch } from "@tauri-apps/plugin-http";
import { GetStateFunction, SubscribeFunction, anime_data } from "../types";

export async function card(
  item: anime_data,
  carousel: HTMLElement,
  watch_callback: (url: string) => void,
  // getCardCount: GetStateFunction<number>,
  // subscribeCardCount: SubscribeFunction<number>,
) {
  const item_node = document.createElement("div");
  item_node.className =
    "relative h-full w-full group/item flex flex-col space-y-2 items-center cursor-pointer rounded-lg";

  item_node.addEventListener("click", () => {
    if (watch_callback == null) return;
    watch_callback(item.redirect);
  });

  carousel.appendChild(item_node);

  let image = "";
  let title = "";

  const serverData = await fetch(
    `${localStorage.getItem("api_url")}/get-anime`,
    {
      method: "POST",
      body: item.redirect,
    },
  );

  if (serverData.status == 404) {
    const redirectstring = await (
      await fetch(`https://aniworld.to${item.redirect}`)
    ).text();

    const redirecthtml = new DOMParser().parseFromString(
      redirectstring,
      "text/html",
    );

    image =
      redirecthtml
        .querySelector(".seriesCoverBox img")
        ?.getAttribute("data-src") || "";

    const imdb_link =
      redirecthtml.querySelector(".imdb-link")?.getAttribute("href") || "";

    if (imdb_link) {
      const imdbstring = await (await fetch(imdb_link)).text();
      const imdbhtml = new DOMParser().parseFromString(imdbstring, "text/html");

      image = imdbhtml.querySelector(".ipc-image")?.getAttribute("srcset");
    }
    title = redirecthtml
      .querySelector(".series-title h1 span")
      ?.textContent?.trim();

    if (image.length !== 0 && title.length !== 0) {
      await fetch(`${localStorage.getItem("api_url")}/set-anime`, {
        method: "POST",
        body: JSON.stringify({
          redirect: item.redirect,
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

  item.title = title;
  item.image = image;

  const item_image = document.createElement("div");
  item_image.className = "w-full aspect-[2/3] overflow-hidden rounded-lg";

  item_node.appendChild(item_image);

  const item_load = document.createElement("div");
  item_load.className =
    "absolute left-0 right-0 aspect-[72/97] bg-neutral-950 border border-neutral-800 animate-pulse rounded-lg";

  item_node.appendChild(item_load);

  const asyncImage = new Image();
  asyncImage.src = item.image.includes("https://")
    ? `${item.image}`
    : `https://aniworld.to${item.image}`;
  asyncImage.className = "w-full h-full object-cover object-center";

  asyncImage.addEventListener("load", () => {
    item_load.remove();
    item_image.appendChild(asyncImage);
  });
}
