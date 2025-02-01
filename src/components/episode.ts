import createState from "../createstate";
import { episode } from "../types";

export function Episode(
  ep: episode,
  episode_wrapper: HTMLElement,
  i: number,
  cache: Map<string, any>,
  player_episodes: episode[],
  episodes: episode[],
  call_player: (i: number) => void,
) {
  const episode_node = document.createElement("div");
  episode_node.className =
    "group relative flex items-center h-fit p-4 cursor-pointer rounded-[24px] hover:bg-neutral-900 transition-colors";

  episode_wrapper.appendChild(episode_node);

  const episode_image = document.createElement("div");
  episode_image.className =
    "relative h-28 flex-shrink-0 aspect-video overflow-hidden rounded-[12px] bg-neutral-800";

  episode_node.appendChild(episode_image);

  if (ep.duration !== 0) {
    const episode_duration = document.createElement("div");
    episode_duration.className =
      "absolute right-2 bottom-2 px-2 py-1 bg-neutral-900/90 rounded-lg text-sm";
    episode_duration.textContent = `${ep.duration} Min`;

    episode_image.appendChild(episode_duration);
  }

  const [getProgress, setProgress, subscribeProgress] = createState({
    duration: 0,
    playtime: 0,
  });

  if (localStorage.getItem("token")) {
    const episode_progress = document.createElement("div");
    episode_progress.className = "absolute bottom-0 left-0 right-0 h-1";

    episode_image.appendChild(episode_progress);

    const episode_progress_inner = document.createElement("div");
    episode_progress_inner.className =
      "h-full bg-red-600 transition-all duration-300";

    subscribeProgress((newProgress) => {
      console.log("newState");
      ep.duration = newProgress.duration;
      ep.playtime = newProgress.playtime;

      cache.set(`episodes-${cache.get("selectedSeason")}`, episodes);

      episode_progress_inner.style.width =
        ep.duration == 0
          ? "0%"
          : (newProgress.playtime / newProgress.duration) * 100 + "%";
    });

    episode_progress.appendChild(episode_progress_inner);
    setProgress({
      duration: ep.duration,
      playtime: ep.playtime,
    });
  }

  const episode_info = document.createElement("div");
  episode_info.className =
    "flex-1 flex flex-col justify-center space-y-1 px-4 overflow-hidden";

  episode_node.appendChild(episode_info);

  const episode_title = document.createElement("h3");
  episode_title.className = "font-medium group-hover:text-white";
  episode_title.textContent = ep.title;

  episode_info.appendChild(episode_title);

  const episode_description = document.createElement("p");
  episode_description.className = "text-sm text-neutral-400 line-clamp-2";
  episode_description.textContent = `Episode ${i + 1}`;

  episode_info.appendChild(episode_description);

  const episode_buttons = document.createElement("div");
  episode_buttons.className = "h-8 w-full flex space-x-2 mt-2";

  const episode_watch = document.createElement("div");
  episode_watch.className =
    "h-8 w-fit pl-2 pr-3 bg-red-700 rounded-lg space-x-1 flex items-center";
  episode_watch.innerHTML =
    "<img src='./icons/play_arrow_24dp.png' class='h-4 w-fit object-cover' /><span class='text-sm'>Watch now</span>";

  episode_buttons.appendChild(episode_watch);

  const [getExpand, setExpand, subscribeExpand] = createState(false);

  const language = document.createElement("div");
  language.className = "relative h-8";

  const language_header = document.createElement("div");
  language_header.className =
    "h-full p-2 bg-red-100/15 text-red-800 rounded-lg flex items-center justify-center";
  language_header.innerHTML =
    "<img src='./icons/language_24dp.svg' class='h-4 w-4' />";

  language.appendChild(language_header);

  const language_list = document.createElement("div");
  language_list.className =
    "absolute bottom-10 right-0 h-8 px-4 bg-neutral-800 rounded-lg flex items-center space-x-2 overflow-hidden";
  language_list.style.width = `calc(${ep.langs.length} * 2rem)`;

  ep.langs.map((lang) => {
    if (lang.length !== 0) {
      const langNode = document.createElement("img");
      langNode.className = "h-4 w-4 object-contain";
      langNode.src = `https://aniworld.to${lang}`;

      language_list.appendChild(langNode);
    }
  });

  subscribeExpand((newExpand) => {
    if (newExpand) {
      language_list.style.display = "flex";
    } else {
      language_list.style.display = "none";
    }
  });

  language.appendChild(language_list);

  episode_buttons.appendChild(language);

  language_header.addEventListener("click", (e: Event) => {
    e.stopPropagation();
    setExpand(!getExpand());
  });

  setExpand(false);

  episode_info.appendChild(episode_buttons);

  const watched = async (duration: number, playtime: number) => {
    if (!localStorage.getItem("token") || !(getProgress().playtime < playtime))
      return;

    const res = await fetch(`${localStorage.getItem("api_url")}/handle-seen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
      body: JSON.stringify({
        playtime: playtime,
        duration: duration,
        id: ep.id,
      }),
    });

    if (res.status == 200) {
      setProgress({ duration: duration, playtime: playtime });
    }
  };

  ep.watched = watched;

  player_episodes.push(ep);

  episode_node.addEventListener("click", () => call_player(i));

  const asyncImage = new Image();
  asyncImage.src = ep.image;
  asyncImage.className = "w-full object-cover";

  asyncImage.addEventListener("load", () => {
    episode_image.appendChild(asyncImage);
  });
}
