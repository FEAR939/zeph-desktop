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
    "group relative flex items-center h-32 cursor-pointer rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors";

  episode_wrapper.appendChild(episode_node);

  const episode_number = document.createElement("div");
  episode_number.className =
    "flex-shrink-0 w-20 flex items-center justify-center text-3xl font-bold text-neutral-500 group-hover:text-white transition-colors";
  episode_number.textContent = (i + 1).toString();

  episode_node.appendChild(episode_number);

  const episode_image = document.createElement("div");
  episode_image.className =
    "relative w-40 flex-shrink-0 aspect-video overflow-hidden rounded-lg bg-neutral-700";

  episode_node.appendChild(episode_image);

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
  episode_info.className = "flex-1 flex flex-col justify-center p-4";

  episode_node.appendChild(episode_info);

  const episode_info_inner = document.createElement("div");
  episode_info_inner.className = "flex items-center";

  episode_info.appendChild(episode_info_inner);

  const episode_title = document.createElement("h3");
  episode_title.className = "font-medium group-hover:text-white";
  episode_title.textContent = `Episode ${i + 1}`;

  episode_info_inner.appendChild(episode_title);

  const episode_description = document.createElement("p");
  episode_description.className = "mt-1 text-sm text-neutral-400 line-clamp-2";
  episode_description.textContent = ep.title;

  episode_info.appendChild(episode_description);

  const watched = async (duration: number, playtime: number) => {
    console.log("callback");
    if (!localStorage.getItem("token") || !(getProgress().playtime < playtime))
      return;

    const res = await fetch("http://animenetwork.org/handle-seen", {
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

    console.log(res);

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
