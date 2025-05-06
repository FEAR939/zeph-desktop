import createState from "../createstate";
import { fetch } from "@tauri-apps/plugin-http";
import { episode } from "../types";

export function Episode(
  ep: episode,
  episode_wrapper: HTMLElement,
  i: number,
  cache: Map<string, any>,
  player_episodes: episode[],
  episodes: episode[],
  call_player: (i: number) => void,
  anime_url: string,
) {
  const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);

  const episode_node = document.createElement("div");
  episode_node.className =
    "group relative flex items-center aspect-[500/281] overflow-hidden rounded-lg bg-neutral-900 cursor-pointer shrink-0";

  if (isMobileDevice) {
    episode_node.classList.add("h-32");
  } else {
    episode_node.classList.add("h-38");
  }

  episode_wrapper.appendChild(episode_node);

  const episode_image = document.createElement("div");
  episode_image.className = "relative h-full w-full";

  episode_node.appendChild(episode_image);

  const [getProgress, setProgress, subscribeProgress] = createState({
    duration: 0,
    playtime: 0,
  });

  if (localStorage.getItem("token")) {
    const episode_progress = document.createElement("div");
    episode_progress.className =
      "absolute z-10 bottom-0 left-0 right-0 h-0.75 rounded-xl overflow-hidden";

    episode_image.appendChild(episode_progress);

    const episode_progress_inner = document.createElement("div");
    episode_progress_inner.className =
      "h-full bg-gradient-to-r from-[rgb(54,95,215)] to-[rgb(143,155,215)] transition-all duration-300";

    subscribeProgress((newProgress) => {
      ep.duration = newProgress.duration;
      ep.playtime = newProgress.playtime;

      cache.set(`episodes-${cache.get("selectedSeason")}`, episodes);

      if (ep.duration !== 0) {
        episode_progress.classList.add("bg-neutral-900");
        episode_progress_inner.style.width =
          (newProgress.playtime / newProgress.duration) * 100 + "%";
      } else {
        episode_progress_inner.style.width = "0%";
      }
    });

    episode_progress.appendChild(episode_progress_inner);
    setProgress({
      duration: ep.duration,
      playtime: ep.playtime,
    });
  }

  const episode_title = document.createElement("h3");
  episode_title.className = "absolute bottom-2 w-full px-2 truncate text-sm";
  episode_title.textContent = ep.title;

  episode_node.appendChild(episode_title);

  const episode_description = document.createElement("p");
  episode_description.className =
    "absolute text-[12px] text-neutral-300 truncate w-full px-2 bottom-7";
  episode_description.textContent = `Episode ${i + 1}`;

  episode_node.appendChild(episode_description);

  const watched = async (duration: number, playtime: number) => {
    const historyres = await fetch(
      `${localStorage.getItem("api_url")}/user/setHistory`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token") || "",
        },
        body: JSON.stringify({
          id: ep.id,
          anime: anime_url,
        }),
      },
    );

    if (historyres.status !== 200) {
      console.error("Could not update user history");
    }

    if (
      !localStorage.getItem("token") ||
      (!(getProgress().playtime < playtime) &&
        !(getProgress().duration < duration))
    )
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

    const nowDate = new Date();

    const activityObj = {
      time: playtime,
      day: nowDate.getDate(),
      month: nowDate.getMonth() + 1,
      year: nowDate.getFullYear(),
    };

    console.log(activityObj);

    const activityres = await fetch(
      `${localStorage.getItem("api_url")}/user/activity/update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token") || "",
        },
        body: JSON.stringify(activityObj),
      },
    );

    if (res.status == 200) {
      setProgress({ duration: duration, playtime: playtime });
    }

    if (activityres.status !== 200) {
      console.error("Could not update user activity");
    }
  };

  ep.watched = watched;

  player_episodes.push(ep);

  episode_node.addEventListener("click", () => call_player(i));

  const asyncImage = new Image();
  asyncImage.src = ep.image;
  asyncImage.className = "h-full w-full object-cover brightness-50";

  asyncImage.addEventListener("load", () => {
    episode_image.appendChild(asyncImage);
  });
}
