import Hls from "hls.js";
import { fetch } from "@tauri-apps/plugin-http";
import { getCurrentWindow } from "@tauri-apps/api/window";
import createState from "./createstate";

type episode = {
  redirect: string;
  title: string;
  image: string;
  duration: number;
  playtime: number;
  id: string;
  watched: ((duration: number, playtime: number) => Promise<void>) | null;
};

type hoster = {
  name: string;
  standard: boolean;
};

async function extract_doodstream_url(video_redirect: string) {
  const htmlString = await (
    await fetch(`https://aniworld.to${video_redirect}`)
  ).text();

  const domainMatch = htmlString.match(/link href="\/\/([\w.]+)"/);
  const passMatch = htmlString.match(/pass_md5\/([\w-]+)\//);
  const tokenMatch = htmlString.match(/token=([^'"&]+)/);

  if (!domainMatch || !passMatch || !tokenMatch) {
    throw new Error("Could not extract necessary URL components");
  }

  const domain = domainMatch[1];
  const passId = passMatch[1];
  const token = tokenMatch[1];

  const url = `https://${domain}/pass_md5/${passId}/${token}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch video URL");

  const baseUrl = await response.text();

  return baseUrl + "?token=" + token + "&expiry=" + Date.now();
}

async function extract_voe_url(video_redirect: string) {
  let html = new DOMParser().parseFromString(
    await (await fetch(`https://aniworld.to${video_redirect}`)).text(),
    "text/html",
  );

  const redirectScript = Array.from(html.querySelectorAll("script")).find(
    (script) => script.text.includes("window.location.href"),
  );
  let redirectSource = redirectScript?.textContent;

  const indexStart = redirectSource?.indexOf("window.location.href = '");
  const indexEnd = redirectSource?.indexOf(";", indexStart);

  if (!indexStart || !indexEnd) throw new Error();
  redirectSource = redirectSource?.substring(indexStart + 24, indexEnd - 1);

  if (!redirectSource) throw new Error();

  html = new DOMParser().parseFromString(
    await (await fetch(redirectSource)).text(),
    "text/html",
  );

  const scriptTag = Array.from(html.querySelectorAll("script")).find((script) =>
    script?.textContent?.includes("var sources"),
  );
  let source = scriptTag?.textContent;

  const startIndex = source?.indexOf("var sources");
  const endIndex = source?.indexOf(";", startIndex);

  if (!startIndex || !endIndex) throw new Error();

  source = source?.substring(startIndex, endIndex);
  source = source?.replace("var sources = ", "");
  source = source?.replace(/'/g, '"').replace(/\\n/g, "").replace(/\\/g, "");

  source = source?.substring(1);
  source = source?.slice(0, -1);
  source = source?.trim();
  source = source?.slice(0, -1);
  source = "{" + source + "}";
  const parsed = JSON.parse(source);

  const hls_source = atob(parsed.hls);
  if (hls_source == null) throw new Error();
  return hls_source;
}

async function player_constructor(episodes: episode[], index: number) {
  const [getIndex, setIndex, subscribeIndex] = createState(0);

  const hosters: hoster[] = [
    { name: "VOE", standard: true },
    { name: "Doodstream", standard: false },
  ];

  const player_wrapper = document.createElement("div");
  player_wrapper.className = "absolute inset-0 z-40 bg-black";

  document.body.appendChild(player_wrapper);

  const player_exit = document.createElement("div");
  player_exit.className =
    "absolute z-50 top-0 left-0 m-4 h-4 w-4 p-4 flex items-center justify-center rounded-full bg-neutral-900 cursor-pointer";
  player_exit.innerHTML =
    "<img src='./icons/close_24dp.png' class='min-h-4 min-w-4' />";

  player_wrapper.appendChild(player_exit);

  const video_player = document.createElement("video");
  video_player.className = "video_player h-full w-full";
  video_player.autoplay = true;
  video_player.preload = "auto";

  player_wrapper.appendChild(video_player);

  const video_controls = document.createElement("div");
  video_controls.className =
    "absolute z-50 bottom-0 left-0 right-0 h-16 px-8 bg-black/50 flex items-center";
  player_wrapper.appendChild(video_controls);

  let timeout: NodeJS.Timeout;

  player_wrapper.addEventListener("mousemove", () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    video_controls.style.display = "flex";
    player_exit.style.display = "flex";
    player_wrapper.style.cursor = "default";
    timeout = setTimeout(() => {
      video_controls.style.display = "none";
      player_exit.style.display = "none";
      player_wrapper.style.cursor = "none";
    }, 3000);
  });

  // Create container for timeline elements
  const timelineContainer = document.createElement("div");
  timelineContainer.className =
    "absolute bottom-[3.25rem] left-8 right-8 h-1 bg-neutral-700 cursor-pointer";

  // Create buffer progress bar
  const bufferBar = document.createElement("div");
  bufferBar.className = "absolute h-full bg-neutral-400";
  bufferBar.style.width = "0%";

  // Create playback progress bar
  const progressBar = document.createElement("div");
  progressBar.className = "absolute h-full bg-red-600";
  progressBar.style.width = "0%";

  // Add elements to DOM
  timelineContainer.appendChild(bufferBar);
  timelineContainer.appendChild(progressBar);
  video_controls.appendChild(timelineContainer);

  // Handle click/drag on timeline
  let isDragging = false;

  timelineContainer.addEventListener("mousedown", (e) => {
    isDragging = true;
    updateTimeFromMouse(e);
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      updateTimeFromMouse(e);
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Update video time based on mouse position
  function updateTimeFromMouse(e: MouseEvent) {
    const rect = timelineContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * video_player.duration;
    video_player.currentTime = Math.max(
      0,
      Math.min(time, video_player.duration),
    );
  }

  // Update timeline when video time updates
  video_player.addEventListener("timeupdate", () => {
    const progress = (video_player.currentTime / video_player.duration) * 100;
    progressBar.style.width = `${progress}%`;
  });

  // Update buffer visualization
  video_player.addEventListener("progress", updateBuffer);

  function updateBuffer() {
    if (video_player.buffered.length > 0) {
      const bufferedEnd = video_player.buffered.end(
        video_player.buffered.length - 1,
      );
      const duration = video_player.duration;
      const bufferProgress = (bufferedEnd / duration) * 100;
      bufferBar.style.width = `${bufferProgress}%`;
    }
  }

  // Add handle/knob
  const handle = document.createElement("div");
  handle.className =
    "absolute h-3 w-3 bg-red-600 rounded-full -right-1.5 top-1/2 -translate-y-1/2";
  progressBar.appendChild(handle);

  // Optional: Add hover state to timeline
  timelineContainer.addEventListener("mouseover", () => {
    handle.classList.add("scale-125");
  });

  timelineContainer.addEventListener("mouseout", () => {
    if (!isDragging) {
      handle.classList.remove("scale-125");
    }
  });

  const startWrapper = document.createElement("div");
  startWrapper.className = "flex items-center justify-start space-x-2";

  video_controls.appendChild(startWrapper);

  const [getPlayState, setPlayState, subscribePlayState] = createState(false);

  const play_pause = document.createElement("img");
  play_pause.className = "h-8 w-8 object-cover cursor-pointer";
  play_pause.src = "./icons/play_arrow_24dp.png";
  startWrapper.appendChild(play_pause);

  subscribePlayState((newState) => {
    console.log(newState);
    if (newState == true) {
      play_pause.src = "./icons/pause_24dp.png";
      video_player.play();
    } else if (newState == false) {
      play_pause.src = "./icons/play_arrow_24dp.png";
      video_player.pause();
    }
  });

  play_pause.addEventListener("click", () => setPlayState(!getPlayState()));
  video_player.addEventListener("click", () => setPlayState(!getPlayState()));

  if (video_player.autoplay) setPlayState(true);

  const nextEpisode = document.createElement("img");
  nextEpisode.className = "h-8 w-8 object-cover cursor-pointer";
  nextEpisode.src = "./icons/fast_forward_24dp.png";

  startWrapper.appendChild(nextEpisode);

  nextEpisode.addEventListener("click", () => {
    if (getIndex() == episodes.length - 1) return;
    const playtime = Math.floor(video_player.currentTime / 60);
    const duration = Math.floor(video_player.duration / 60);

    if (episodes[getIndex()].watched !== null) {
      episodes[getIndex()].watched(duration, playtime);
    }
    setIndex(getIndex() + 1);
  });

  const volume = document.createElement("input");
  volume.className = "h-1 w-16 cursor-pointer";
  volume.type = "range";
  volume.min = "0";
  volume.max = "100";
  volume.value = "100";
  if (localStorage.getItem("volume")) {
    volume.value = localStorage.getItem("volume") || "100";
    video_player.volume =
      parseInt(localStorage.getItem("volume") || "100") / 100;
  }

  startWrapper.appendChild(volume);

  volume.addEventListener(
    "input",
    () => (video_player.volume = parseInt(volume.value) / 100),
  );

  volume.addEventListener("change", () => {
    localStorage.setItem("volume", volume.value);
  });

  const timeCounter = document.createElement("div");
  timeCounter.textContent = "00:00 | 00:00";

  startWrapper.appendChild(timeCounter);

  video_player.addEventListener("timeupdate", () => {
    timeCounter.textContent = `${new Date(video_player.currentTime * 1000).toISOString().substring(14, 19)} | ${new Date(video_player.duration * 1000).toISOString().substring(14, 19)}`;
  });

  const middleWrapper = document.createElement("div");
  middleWrapper.className = "flex-1 flex items-center justify-center space-x-2";

  video_controls.appendChild(middleWrapper);

  const episode_title = document.createElement("div");
  episode_title.className = "max-w-[50%] truncate";

  middleWrapper.appendChild(episode_title);

  const [getHoster, setHoster, subscribeHoster] = createState("");

  const hoster_selection = document.createElement("select");
  hoster_selection.className =
    "flex items-center space-x-2 bg-neutral-800 w-32 px-2 py-0.5 rounded-full border-r-8 outline-0 border-neutral-800 cursor-pointer";

  middleWrapper.appendChild(hoster_selection);

  hoster_selection.addEventListener("change", () => {
    setHoster(hoster_selection.value);
  });

  const endWrapper = document.createElement("div");
  endWrapper.className = "flex items-center justify-end space-x-2";

  video_controls.appendChild(endWrapper);

  const episodeToggle = document.createElement("img");
  episodeToggle.className = "h-8 w-8 object-cover cursor-pointer";
  episodeToggle.src = "./icons/menu_24dp.png";

  endWrapper.appendChild(episodeToggle);

  const episodeWrapper = document.createElement("div");
  episodeWrapper.className =
    "absolute bottom-20 right-4 h-[36rem] w-96 p-2 bg-neutral-900 rounded-lg overflow-hidden overflow-y-scroll hidden";

  player_wrapper.appendChild(episodeWrapper);

  episodes.map((episode, i) => {
    if (episodeWrapper == null) return;
    const episode_node = document.createElement("div");
    episode_node.className =
      "group relative flex items-center h-16 cursor-pointer rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors";

    episodeWrapper.appendChild(episode_node);

    if (getIndex() == i) {
      episode_node.classList.add("bg-neutral-800");
    }

    subscribeIndex((newIndex) => {
      if (newIndex == i) {
        episode_node.classList.add("bg-neutral-800");
      } else {
        episode_node.classList.remove("bg-neutral-800");
      }
    });

    episode_node.addEventListener("click", () => setIndex(i));

    const episode_number = document.createElement("div");
    episode_number.className =
      "flex-shrink-0 w-10 flex items-center justify-center text-1xl font-bold text-neutral-500 group-hover:text-white transition-colors";
    episode_number.textContent = (i + 1).toString();

    episode_node.appendChild(episode_number);

    const episode_image = document.createElement("div");
    episode_image.className =
      "relative w-20 flex-shrink-0 aspect-video overflow-hidden rounded-lg bg-neutral-700";

    episode_node.appendChild(episode_image);

    const episode_info = document.createElement("div");
    episode_info.className =
      "flex-1 flex flex-col justify-center p-4 overflow-hidden";

    episode_node.appendChild(episode_info);

    const episode_info_inner = document.createElement("div");
    episode_info_inner.className = "flex items-center";

    episode_info.appendChild(episode_info_inner);

    const episode_title = document.createElement("h3");
    episode_title.className = "font-medium group-hover:text-white";
    episode_title.textContent = `Episode ${i + 1}`;

    episode_info_inner.appendChild(episode_title);

    const episode_description = document.createElement("p");
    episode_description.className =
      "w-full mt-1 text-sm text-neutral-400 truncate";
    episode_description.textContent = episode.title;

    episode_info.appendChild(episode_description);

    const asyncImage = new Image();
    asyncImage.src = episode.image;
    asyncImage.className = "w-full object-cover";

    asyncImage.addEventListener("load", () => {
      episode_image.appendChild(asyncImage);
    });

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
        episode.duration = newProgress.duration;
        episode.playtime = newProgress.playtime;

        episode_progress_inner.style.width =
          episode.duration == 0
            ? "0%"
            : (newProgress.playtime / newProgress.duration) * 100 + "%";
      });

      episode_progress.appendChild(episode_progress_inner);
      setProgress({
        duration: episode.duration,
        playtime: episode.playtime,
      });

      video_player.addEventListener("timeupdate", () => {
        if (i !== getIndex()) return;

        const playtime = Math.floor(video_player.currentTime / 60);
        const duration = Math.floor(video_player.duration / 60);

        if (episodes[i].playtime > playtime) return;

        episodes[i].duration = duration;
        episodes[i].playtime = playtime;

        setProgress({
          duration: episode.duration,
          playtime: episode.playtime,
        });
      });
    }
  });

  episodeToggle.addEventListener("click", () => {
    episodeWrapper.classList.toggle("hidden");
  });

  const [getFullscreenState, setFullscreenState, subscribeFullscreenState] =
    createState(false);

  const fullscreen = document.createElement("img");
  fullscreen.className = "h-8 w-8 object-cover cursor-pointer";
  fullscreen.src = "./icons/fullscreen_24dp.png";

  endWrapper.appendChild(fullscreen);

  subscribeFullscreenState(async (newState) => {
    console.log(newState);
    if (newState == true) {
      fullscreen.src = "./icons/fullscreen_exit_24dp.png";
      await getCurrentWindow().setFullscreen(true);
    } else if (newState == false) {
      fullscreen.src = "./icons/fullscreen_24dp.png";
      await getCurrentWindow().setFullscreen(false);
    }
  });

  fullscreen.addEventListener("click", () =>
    setFullscreenState(!getFullscreenState()),
  );

  let episode_hosters: NodeListOf<HTMLAnchorElement>;
  let video_redirect = "";

  subscribeHoster(async (newHoster) => {
    for (let i = 0; i < episode_hosters.length; i++) {
      const hoster = episode_hosters[i];
      const hoster_name = hoster.querySelector("h4")?.textContent;
      const hoster_redirect = hoster.getAttribute("href");
      console.log(hoster_name, hoster_redirect);
      if (hoster_redirect == null || hoster_redirect == undefined) continue;
      if (hoster_name == newHoster) {
        video_redirect = hoster_redirect;
        break;
      }
    }

    let final_url: string | null = null;

    console.log(video_redirect);
    if (video_redirect !== null) {
      try {
        if (newHoster == "Doodstream") {
          final_url = await extract_doodstream_url(video_redirect);
        } else if (newHoster == "VOE") {
          final_url = await extract_voe_url(video_redirect);
        }
      } catch (e) {
        console.error(e);
      }
    }

    console.log(final_url);

    if (Hls.isSupported() && newHoster == "VOE" && final_url !== null) {
      const hls = new Hls({
        enableWorker: true,
        debug: false,
      });

      hls.loadSource(final_url);
      hls.attachMedia(video_player as HTMLVideoElement);
    } else if (newHoster == "Doodstream" && final_url !== null) {
      video_player.src = final_url;
    }
  });

  subscribeIndex(async (newIndex) => {
    console.log(newIndex);
    video_player.currentTime = episodes[newIndex].playtime * 60;
    episode_title.textContent = episodes[newIndex].title;

    const html = new DOMParser().parseFromString(
      await (
        await fetch(`https://aniworld.to${episodes[newIndex].redirect}`)
      ).text(),
      "text/html",
    );

    episode_hosters = html.querySelectorAll(".watchEpisode");

    hoster_selection.innerHTML = "";
    hosters.forEach((hoster: hoster) => {
      const hoster_option = document.createElement("option");
      hoster_option.value = hoster.name;
      hoster_option.textContent = hoster.name;
      if (hoster.standard) {
        hoster_option.selected = true;
        setHoster(hoster.name);
      }

      hoster_selection.appendChild(hoster_option);
    });
  });

  player_exit.addEventListener("click", async () => {
    const playtime = Math.floor(video_player.currentTime / 60);
    const duration = Math.floor(video_player.duration / 60);
    if (episodes[getIndex()].watched !== null) {
      episodes[getIndex()].watched(duration, playtime);
    }

    player_wrapper.remove();
    await getCurrentWindow().setFullscreen(false);
  });

  setIndex(index);
}

export default player_constructor;
