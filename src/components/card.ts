import createState from "../createstate";
import { fetch } from "@tauri-apps/plugin-http";
import { GetStateFunction, SubscribeFunction, anime_data } from "../types";

export function card(
  item: anime_data,
  carousel: HTMLElement,
  watch_callback: (url: string) => void,
  mylist_handler: (method: string, data?: anime_data) => Promise<void>,
  // getCardCount: GetStateFunction<number>,
  // subscribeCardCount: SubscribeFunction<number>,
) {
  const item_node = document.createElement("div");
  item_node.className =
    "relative h-full w-full group/item flex items-center justify-center flex-shrink-0 mx-[.25rem] rounded-lg cursor-pointer";
  // item_node.style.width = `calc(((100vw - 4rem) / ${getCardCount()}) - .5rem)`;
  // item_node.style.height = `calc(((100vw - 4rem) / ${getCardCount()}) - .5rem) * 1.3/1)`;

  // subscribeCardCount((newCount) => {
  //   item_node.style.width = `calc(((100vw - 4rem) / ${newCount}) - .5rem)`;
  //   item_node.style.height = `calc(((100vw - 4rem) / ${newCount}) - .5rem) * 1.3/1)`;
  // });

  item_node.addEventListener("click", () => {
    if (watch_callback == null) return;
    watch_callback(item.redirect);
  });

  carousel.appendChild(item_node);

  const item_image = document.createElement("div");
  item_image.className = "w-full aspect-[1/1.3] overflow-hidden rounded-lg";

  item_node.appendChild(item_image);

  const item_glow = document.createElement("div");
  item_glow.className =
    "absolute -inset-8 -z-10 blur-2xl opacity-0 group-hover/item:opacity-100 transition-all ease-in-out duration-300";

  item_node.appendChild(item_glow);

  const item_load = document.createElement("div");
  item_load.className =
    "absolute inset-0 bg-neutral-900/50 animate-pulse rounded-lg";

  item_node.appendChild(item_load);

  const asyncImage = new Image();
  asyncImage.src = `https://aniworld.to${item.image}`;
  asyncImage.className = "w-full h-full object-cover object-top";

  asyncImage.addEventListener("load", () => {
    item_load.remove();
    item_image.appendChild(asyncImage);
    item_glow.appendChild(asyncImage.cloneNode());
  });
}
