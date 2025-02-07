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
    "relative h-full w-full group/item flex flex-col space-y-2 items-center rounded-lg cursor-pointer";

  item_node.addEventListener("click", () => {
    if (watch_callback == null) return;
    watch_callback(item.redirect);
  });

  carousel.appendChild(item_node);

  const item_image = document.createElement("div");
  item_image.className = "w-full aspect-[72/97] overflow-hidden rounded-lg";

  item_node.appendChild(item_image);

  const item_title = document.createElement("h5");
  item_title.className = "w-full font-semibold text-sm line-clamp-2";
  item_title.textContent = item.title;

  item_node.appendChild(item_title);

  const item_load = document.createElement("div");
  item_load.className =
    "absolute left-0 right-0 aspect-[72/97] bg-neutral-950 border border-neutral-800 animate-pulse rounded-lg";

  item_node.appendChild(item_load);

  const asyncImage = new Image();
  asyncImage.src = `https://aniworld.to${item.image}`;
  asyncImage.className = "w-full h-full object-fit";

  asyncImage.addEventListener("load", () => {
    item_load.remove();
    item_image.appendChild(asyncImage);
  });
}
