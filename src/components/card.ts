import createState from "../createstate";
import { GetStateFunction, SubscribeFunction, anime_data } from "../types";

export function card(
  item: anime_data,
  carousel: HTMLElement,
  watch_callback: (url: string) => void,
  mylist_handler: (method: string, data?: anime_data) => Promise<void>,
  getCardCount: GetStateFunction<number>,
  subscribeCardCount: SubscribeFunction<number>,
) {
  const item_node = document.createElement("div");
  item_node.className =
    "relative group/item flex items-center justify-center flex-shrink-0 mx-[.25rem] rounded-lg cursor-pointer";
  item_node.style.width = `calc(((100vw - 4rem) / ${getCardCount()}) - .5rem)`;
  item_node.style.height = `calc(((100vw - 4rem) / ${getCardCount()}) - .5rem) * 1.3/1)`;

  subscribeCardCount((newCount) => {
    item_node.style.width = `calc(((100vw - 4rem) / ${newCount}) - .5rem)`;
    item_node.style.height = `calc(((100vw - 4rem) / ${newCount}) - .5rem) * 1.3/1)`;
  });

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

  if (localStorage.getItem("token")) {
    const [getList, setList, subscribeList] = createState(0);

    const on_list = document.createElement("div");
    on_list.className =
      "absolute group-hover/item:opacity-100 group-hover/item:translate-x-0 opacity-0 translate-x-1 left-2 bottom-2 w-fit flex items-center space-x-1 bg-neutral-800 px-2 py-1 rounded-lg cursor-pointer transition ease-in duration-300";
    on_list.textContent = "...";
    on_list.id = "on_list";

    item_node.appendChild(on_list);

    subscribeList((newList) => {
      if (newList == 1) {
        on_list.innerHTML =
          "<img src='./icons/remove_24dp.png' class='h-4 w-4' /><span class='text-sm pr-1'>My List</span>";
      } else {
        on_list.innerHTML =
          "<img src='./icons/add_24dp.png' class='h-4 w-4' /><span class='text-sm pr-1'>My List</span>";
      }
    });

    const mylist =
      JSON.parse(localStorage.getItem("mylist") || "").mylist.items || [];

    const index = mylist.findIndex(
      (a: anime_data) => a.redirect == item.redirect,
    );

    if (index !== -1) {
      setList(1);
    } else {
      setList(0);
    }

    let ackstate = false;

    on_list.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (getList() == 1 && !ackstate) {
        ackstate = true;
        on_list.innerHTML = "<span class='text-sm px-1'>Sure?</span>";
        return;
      }

      const res = await fetch(
        `${localStorage.getItem("api_url")}/handle-marked`,
        {
          method: "POST",
          headers: {
            Authorization: localStorage.getItem("token") || "",
          },
          body: item.redirect.toString(),
        },
      );
      if (!res.ok) return;
      mylist_handler(getList() == 0 ? "add" : "rm", {
        redirect: item.redirect,
        image: item.image,
        title: item.title,
      });
      setList(getList() == 0 ? 1 : 0);
    });

    on_list.addEventListener("mouseleave", () => {
      ackstate = false;
      setList(getList());
    });
  }
}
