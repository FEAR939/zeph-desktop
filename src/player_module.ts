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

async function player_constructor(
  episode: episode,
  callback: (duration: number, playtime: number) => void,
) {
  const hosters: hoster[] = [{ name: "VOE", standard: true }, { name: "Doodstream", standard: false }];

  const player_wrapper = document.createElement("div");
  player_wrapper.className = "absolute inset-0 z-40 bg-black";

  document.body.appendChild(player_wrapper);

  const player_exit = document.createElement("div");
  player_exit.className =
    "absolute z-50 top-0 left-0 m-4 h-4 w-4 p-4 flex items-center justify-center rounded-full bg-neutral-900";
  player_exit.innerHTML =
    "<img src='./icons/close_24dp.png' class='min-h-4 min-w-4' />";

  player_wrapper.appendChild(player_exit);

  const video_player = document.createElement("video");
  video_player.className = "video_player h-full w-full";
  video_player.autoplay = true;
  video_player.currentTime = episode.playtime * 60;
  player_wrapper.appendChild(video_player);

  const video_controls = document.createElement("div");
  video_controls.className =
    "absolute z-50 bottom-0 left-0 right-0 h-16 px-8 bg-black/50 flex items-center justify-between";
  player_wrapper.appendChild(video_controls);

  let timeout: NodeJS.Timeout;

  player_wrapper.addEventListener("mousemove", () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    video_controls.style.display = "flex";
    player_exit.style.display = "flex";
    timeout = setTimeout(() => {
      video_controls.style.display = "none";
      player_exit.style.display = "none";
    }, 3000);
  });

  const timeline = document.createElement("input");
  timeline.className = "absolute bottom-14 left-8 right-8 h-1";
  timeline.type = "range";
  timeline.min = "0";
  timeline.value = "0";

  video_controls.appendChild(timeline);

  video_player.addEventListener("loadedmetadata", () => {
    timeline.max = video_player.duration.toString();
  });

  video_player.addEventListener("timeupdate", () => {
    timeline.value = video_player.currentTime.toString();
  });

  timeline.addEventListener("input", () => {
    video_player.currentTime = parseInt(timeline.value);
  });

  const [getPlayState, setPlayState, subscribePlayState] = createState(false);

  const play_pause = document.createElement("img");
  play_pause.className = "h-8 w-8 object-cover";
  play_pause.src = "./icons/play_arrow_24dp.png";
  video_controls.appendChild(play_pause);

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

  const episode_title = document.createElement("div");
  episode_title.className = "max-w-[50%] truncate";
  episode_title.textContent = episode.title;

  video_controls.appendChild(episode_title);

  const [getHoster, setHoster, subscribeHoster] = createState("");

  const hoster_selection = document.createElement("select");
  hoster_selection.className =
    "flex items-center space-x-2 bg-neutral-800 w-32 px-2 py-0.5 rounded-lg border-r-8 outline-0 border-neutral-800";

  video_controls.appendChild(hoster_selection);

  hoster_selection.addEventListener("change", () => {
    setHoster(hoster_selection.value);
  });

  const [getFullscreenState, setFullscreenState, subscribeFullscreenState] =
    createState(false);

  const fullscreen = document.createElement("img");
  fullscreen.className = "h-8 w-8 object-cover";
  fullscreen.src = "./icons/fullscreen_24dp.png";

  video_controls.appendChild(fullscreen);

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

  const html = new DOMParser().parseFromString(
    await (await fetch(`https://aniworld.to${episode.redirect}`)).text(),
    "text/html",
  );

  const episode_hosters = html.querySelectorAll(".watchEpisode");

  let video_redirect: string | null = null;

  subscribeHoster(async newHoster => {
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
    };
  
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

  player_exit.addEventListener("click", async () => {
    const playtime = Math.floor(video_player.currentTime / 60);
    const duration = Math.floor(video_player.duration / 60);

    callback(duration, playtime);
    player_wrapper.remove();
    await getCurrentWindow().setFullscreen(false);
  });
}

export default player_constructor;
