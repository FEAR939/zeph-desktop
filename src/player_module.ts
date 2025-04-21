import Hls from "hls.js";
import { fetch } from "@tauri-apps/plugin-http";
import { getCurrentWindow } from "@tauri-apps/api/window";
import createState from "./createstate";
import { Selector } from "./components/selector";

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
  label: string;
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
  function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (char) {
      const charCode = char.charCodeAt(0);
      // Check if it's an uppercase letter
      if (charCode >= 65 && charCode <= 90) {
        return String.fromCharCode(((charCode - 65 + 13) % 26) + 65);
      }
      // Check if it's a lowercase letter
      else if (charCode >= 97 && charCode <= 122) {
        return String.fromCharCode(((charCode - 97 + 13) % 26) + 97);
      }
      // Return unchanged if not a letter
      return char;
    });
  }

  function base64ToUtf8(base64Str) {
    try {
      // Decode Base64 to a binary string
      const binaryString = atob(base64Str);
      // Convert the binary string to a Uint8Array
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Use TextDecoder to decode the bytes as UTF-8
      const decoder = new TextDecoder("utf-8");
      return decoder.decode(bytes);
    } catch (e) {
      // Catch potential errors from atob (e.g., invalid characters)
      console.error("Base64 decoding error:", e);
      throw new Error(
        `Invalid Base64 string starting with: ${base64Str.substring(0, 10)}...`,
      );
    }
  }

  function sanitizeInput(text, htmlPageText) {
    // Pattern to find the blacklist string structure like ['a','b','c','d','e','f','g']
    const blacklistPattern = /\[\s*'([^']+)'(?:\s*,\s*'([^']+)'){6}\s*\]/s; // 's' flag for DOTALL
    const matchB = htmlPageText.match(blacklistPattern);

    // Get the entire matched string (e.g., "['a','b','c','d','e','f','g']") or an empty string if no match.
    const blacklistString = matchB ? matchB[0] : "";

    let result = text;

    // Iterate over each character in the matched blacklist string
    for (let i = 0; i < blacklistString.length; i++) {
      const symbol = blacklistString[i];
      // Escape the symbol to safely use it in a RegExp
      const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Create a RegExp to find all occurrences globally
      const pattern = new RegExp(escapedSymbol, "g");
      // Replace occurrences with underscore
      result = result.replace(pattern, "_");
    }
    return result;
  }

  function shiftBack(str, shift) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) - shift);
    }
    return result;
  }

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

  html = await (await fetch(redirectSource)).text();

  let sourceJson = null;

  const MKGMaPattern = /MKGMa="(.*?)"/s;
  const match = html.match(MKGMaPattern);

  if (match && match[1]) {
    // Check if match and capturing group exist
    const rawMKGMa = match[1];

    try {
      const encryptedData = rot13(rawMKGMa);
      // Use the specific sanitizeInput implementation
      const cleanedInput = sanitizeInput(encryptedData, html);
      // Replace any remaining underscores globally ('g' flag)
      const underscoreRemoved = cleanedInput.replace(/_/g, "");

      // First Base64 decode (assuming result might be UTF-8)
      const decodedFromBase64 = base64ToUtf8(underscoreRemoved);

      const shiftedBack = shiftBack(decodedFromBase64, 3);
      const reversedString = shiftedBack.split("").reverse().join("");

      // Second Base64 decode (final result likely UTF-8 JSON or text)
      const decoded = base64ToUtf8(reversedString);

      try {
        const parsedJson = JSON.parse(decoded);

        if ("direct_access_url" in parsedJson) {
          sourceJson = { mp4: parsedJson["direct_access_url"] };
          console.log("[+] Found direct .mp4 URL in JSON.");
        } else if ("source" in parsedJson) {
          sourceJson = { hls: parsedJson["source"] };
          console.log("[+] Found fallback .m3u8 URL in JSON.");
        } else {
          console.log(
            "[-] JSON found, but required keys ('direct_access_url' or 'source') are missing.",
          );
        }
      } catch (jsonError) {
        // Catch JSON parsing errors (SyntaxError)
        console.log(
          "[-] Decoded string is not valid JSON. Attempting fallback regex search...",
        );
        // console.log("Decoded string:", decoded); // Optional: Log for debugging

        // Regex searches on the decoded string
        const mp4Regex = /https?:\/\/[^\s"]+\.mp4[^\s"]*/;
        const m3u8Regex = /https?:\/\/[^\s"]+\.m3u8[^\s"]*/;

        const mp4Match = decoded.match(mp4Regex);
        const m3u8Match = decoded.match(m3u8Regex);

        if (mp4Match) {
          sourceJson = { mp4: mp4Match[0] }; // match[0] is the full matched URL
          console.log("[+] Found base64 encoded MP4 URL via regex.");
        } else if (m3u8Match) {
          sourceJson = { hls: m3u8Match[0] }; // match[0] is the full matched URL
          console.log("[+] Found base64 encoded HLS (m3u8) URL via regex.");
        } else {
          console.log(
            "[-] Fallback regex search failed to find .mp4 or .m3u8 URLs.",
          );
        }
      }
    } catch (e) {
      console.error(`[-] Error while decoding MKGMa string: ${e.message || e}`);
      // Optionally: console.error(e); // Log the full error stack
    }
  } else {
    console.log("[-] MKGMa pattern not found in the HTML page.");
  }

  if (!sourceJson) {
    console.log("[-] Could not extract any source URL.");
  }

  console.log(sourceJson);
  return sourceJson;
}

async function player_constructor(episodes: episode[], index: number) {
  const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
  const [getIndex, setIndex, subscribeIndex] = createState(0);
  const [getMini, setMini, subscribeMini] = createState(false);

  const hosters: hoster[] = [
    { label: "VOE", standard: true },
    { label: "Doodstream", standard: false },
  ];

  let player_wrapper = document.createElement("div");
  subscribeMini((newMini) => {
    if (newMini && !isMobileDevice) {
      player_wrapper.className =
        "absolute bottom-4 right-4 h-64 aspect-video z-50 bg-black overflow-hidden rounded-lg";
    } else if (newMini && isMobileDevice) {
      player_wrapper.className = player_wrapper.className =
        "absolute bottom-4 right-4 h-44 aspect-video z-50 bg-black overflow-hidden rounded-lg";
    } else {
      player_wrapper.className =
        "absolute inset-0 z-40 bg-black overflow-hidden";
    }
  });

  document.body.appendChild(player_wrapper);

  const player_exit = document.createElement("div");
  if (!isMobileDevice) {
    player_exit.className = "absolute z-50 top-4 left-4 h-8 w-8 cursor-pointer";
  } else {
    player_exit.className = "absolute z-50 top-4 left-4 h-6 w-6 cursor-pointer";
  }
  player_exit.innerHTML =
    "<img src='./icons/keyboard_backspace_24dp.png' class='h-full w-full' />";

  player_wrapper.appendChild(player_exit);

  const player_toggleMini = document.createElement("div");
  if (!isMobileDevice) {
    player_toggleMini.className =
      "absolute z-50 top-4 left-16 h-8 w-8 cursor-pointer";
  } else {
    player_toggleMini.className =
      "absolute z-50 top-4 left-16 h-6 w-6 cursor-pointer";
  }
  player_toggleMini.innerHTML =
    "<img src='./icons/close_fullscreen_24dp.png' class='h-full w-full' />";

  player_wrapper.appendChild(player_toggleMini);

  player_toggleMini.addEventListener("click", () => {
    setMini(!getMini());
  });

  const episode_title = document.createElement("div");
  if (!isMobileDevice) {
    episode_title.className =
      "absolute top-4 left-28 h-8 flex items-center text-xl max-w-[50%] truncate";
  } else {
    episode_title.className =
      "absolute top-4 left-28 h-6 flex items-center text-lg max-w-[50%] truncate";
  }

  player_wrapper.appendChild(episode_title);

  const video_player = document.createElement("video");
  video_player.className = "h-full w-full";
  video_player.autoplay = true;
  video_player.preload = "auto";

  player_wrapper.appendChild(video_player);

  video_player.addEventListener("loadedmetadata", () => {
    console.log(episodes, getIndex());
    console.log(episodes[getIndex()].playtime);
    video_player.currentTime = episodes[getIndex()].playtime * 60;
  });

  const video_layer = document.createElement("div");
  video_layer.className =
    "absolute inset-0 h-full w-full flex items-center justify-center space-x-4";

  player_wrapper.appendChild(video_layer);

  const big_reverse_button = document.createElement("img");
  if (!isMobileDevice) {
    big_reverse_button.className = "h-12 w-12 cursor-pointer";
  } else {
    big_reverse_button.className = "h-8 w-8 cursor-pointer";
  }
  big_reverse_button.src = "./icons/replay_10_24dp.svg";

  video_layer.appendChild(big_reverse_button);

  const big_play_button = document.createElement("img");
  if (!isMobileDevice) {
    big_play_button.className = "h-24 w-24 cursor-pointer";
  } else {
    big_play_button.className = "h-16 w-16 cursor-pointer";
  }
  big_play_button.src = "./icons/play_arrow_24dp.png";

  video_layer.appendChild(big_play_button);

  const big_forward_button = document.createElement("img");
  if (!isMobileDevice) {
    big_forward_button.className = "h-12 w-12 cursor-pointer";
  } else {
    big_forward_button.className = "h-8 w-8 cursor-pointer";
  }

  big_forward_button.src = "./icons/forward_10_24dp.svg";

  video_layer.appendChild(big_forward_button);

  big_reverse_button.addEventListener("click", (e) => {
    e.stopPropagation();
    video_player.currentTime -= 10;
  });

  big_forward_button.addEventListener("click", (e) => {
    e.stopPropagation();
    video_player.currentTime += 10;
  });

  let touched = false;

  video_layer.addEventListener("click", () => {
    if (!touched && isMobileDevice) {
      touched = true;
      return;
    }

    if (video_player.paused) {
      video_player.play();
    } else {
      video_player.pause();
    }
  });

  const video_controls = document.createElement("div");
  video_controls.className =
    "absolute z-50 bottom-0 left-0 right-0 h-16 px-4 pt-4 bg-black/50 flex items-center";
  player_wrapper.appendChild(video_controls);

  let timeout: NodeJS.Timeout;

  player_wrapper.addEventListener("mousemove", () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    video_controls.style.display = "flex";
    player_exit.style.display = "flex";
    player_toggleMini.style.display = "flex";
    episode_title.style.display = "flex";
    player_wrapper.style.cursor = "default";
    video_layer.style.display = "flex";
    timeout = setTimeout(() => {
      if (video_player.paused) return;
      video_controls.style.display = "none";
      player_exit.style.display = "none";
      player_toggleMini.style.display = "none";
      episode_title.style.display = "none";
      player_wrapper.style.cursor = "none";
      video_layer.style.display = "none";
      touched = false;
    }, 3000);
  });

  // Create container for timeline elements
  const timelineContainer = document.createElement("div");
  timelineContainer.className =
    "absolute bottom-[3.25rem] left-4 right-4 h-0.75 bg-neutral-700 cursor-pointer";

  // Create buffer progress bar
  const bufferBar = document.createElement("div");
  bufferBar.className = "absolute h-full bg-neutral-400";
  bufferBar.style.width = "0%";

  // Create playback progress bar
  const progressBar = document.createElement("div");
  progressBar.className = "absolute h-full bg-white";
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
    "absolute h-3 w-3 bg-white rounded-full -right-1.5 top-1/2 -translate-y-1/2";
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
    if (newState == true) {
      play_pause.src = "./icons/pause_24dp.png";
      big_play_button.src = "./icons/pause_24dp.png";
      video_player.play();
    } else if (newState == false) {
      play_pause.src = "./icons/play_arrow_24dp.png";
      big_play_button.src = "./icons/play_arrow_24dp.png";
      video_player.pause();
    }
  });

  play_pause.addEventListener("click", () => setPlayState(!getPlayState()));
  video_player.addEventListener("click", () => setPlayState(!getPlayState()));

  video_player.addEventListener("play", () => setPlayState(true));
  video_player.addEventListener("pause", () => setPlayState(false));

  window.addEventListener("keyup", handleKeyup);

  if (video_player.autoplay) setPlayState(true);

  const nextEpisode = document.createElement("img");
  nextEpisode.className = "h-8 w-8 object-cover cursor-pointer";
  nextEpisode.src = "./icons/fast_forward_24dp.png";

  startWrapper.appendChild(nextEpisode);

  nextEpisode.addEventListener("click", () => {
    if (getIndex() == episodes.length - 1) return;
    video_player.pause();
    const playtime = Math.floor(video_player.currentTime / 60);
    const duration = Math.floor(video_player.duration / 60);

    console.log(getIndex());

    if (episodes[getIndex()].watched !== null) {
      episodes[getIndex()]?.watched?.(duration, playtime);
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
  timeCounter.className = "w-32";
  timeCounter.textContent = "00:00 | 00:00";

  startWrapper.appendChild(timeCounter);

  video_player.addEventListener("timeupdate", () => {
    timeCounter.textContent = `${new Date(video_player.currentTime * 1000).toISOString().substring(14, 19)} | ${new Date(video_player.duration * 1000).toISOString().substring(14, 19)}`;
  });

  const introSkip = document.createElement("div");
  introSkip.className =
    "flex items-center rounded-md bg-neutral-900 hover:bg-neutral-800 px-2 py-1 space-x-2 cursor-pointer transition-colors";
  introSkip.innerHTML =
    "<img src='./icons/skip_next_24dp.png' class='h-4 w-4' /><span class='text-sm'>Intro</span>";

  startWrapper.appendChild(introSkip);

  introSkip.addEventListener("click", () => {
    if (video_player.currentTime + 85 > video_player.duration) return;
    video_player.currentTime += 85;
  });

  const middleWrapper = document.createElement("div");
  middleWrapper.className = "flex-1 flex items-center justify-center space-x-2";

  video_controls.appendChild(middleWrapper);

  const [, setHoster, subscribeHoster] = createState("");

  const selector = Selector(middleWrapper, []);

  selector.subscribe((newHoster) => setHoster(newHoster));

  const endWrapper = document.createElement("div");
  endWrapper.className = "flex items-center justify-end space-x-2";

  video_controls.appendChild(endWrapper);

  const episodeToggle = document.createElement("img");
  episodeToggle.className = "h-8 w-8 object-cover cursor-pointer";
  episodeToggle.src = "./icons/menu_24dp.png";

  endWrapper.appendChild(episodeToggle);

  const episodeWrapper = document.createElement("div");
  episodeWrapper.className =
    "absolute bottom-20 right-4 h-[36rem] w-96 p-2 bg-neutral-900 rounded-xl overflow-hidden overflow-y-scroll hidden space-y-2";

  if (isMobileDevice) {
    episodeWrapper.classList.replace("h-[36rem]", "h-[16rem]");
  }

  player_wrapper.appendChild(episodeWrapper);

  episodes.map((episode, i) => {
    if (episodeWrapper == null) return;

    const episode_node = document.createElement("div");
    episode_node.className =
      "group relative flex items-center h-fit cursor-pointer";

    episodeWrapper.appendChild(episode_node);

    const episode_image = document.createElement("div");
    episode_image.className =
      "relative flex-shrink-0 aspect-video overflow-hidden rounded-lg bg-neutral-900";

    episode_image.classList.add("h-22");

    episode_node.appendChild(episode_image);

    if (episode.duration !== 0) {
      const episode_duration = document.createElement("div");
      episode_duration.className =
        "absolute right-2 bottom-4 px-2 py-1 bg-neutral-900/90 rounded-lg text-sm";
      episode_duration.textContent = `${episode.duration} Min`;

      episode_image.appendChild(episode_duration);
    }

    const [getProgress, setProgress, subscribeProgress] = createState({
      duration: 0,
      playtime: 0,
    });

    if (localStorage.getItem("token")) {
      const episode_progress = document.createElement("div");
      episode_progress.className =
        "absolute bottom-2 left-2 right-2 h-0.75 rounded-xl overflow-hidden";

      episode_image.appendChild(episode_progress);

      const episode_progress_inner = document.createElement("div");
      episode_progress_inner.className =
        "h-full bg-white transition-all duration-300";

      subscribeProgress((newProgress) => {
        if (newProgress.duration !== 0) {
          episode_progress.classList.add("bg-neutral-900");
          episode_progress_inner.style.width =
            (newProgress.playtime / newProgress.duration) * 100 + "%";
        } else {
          episode_progress_inner.style.width = "0%";
        }
      });

      episode_progress.appendChild(episode_progress_inner);
      setProgress({
        duration: episode.duration,
        playtime: episode.playtime,
      });
    }

    const episode_info = document.createElement("div");
    episode_info.className =
      "flex-1 flex flex-col justify-center space-y-1 px-4 overflow-hidden";

    episode_node.appendChild(episode_info);

    const episode_title = document.createElement("h3");
    episode_title.className = "font-medium group-hover:text-white";
    episode_title.textContent = episode.title;

    episode_title.classList.add("truncate");

    episode_info.appendChild(episode_title);

    const episode_description = document.createElement("p");
    episode_description.className = "text-sm text-neutral-400 line-clamp-2";
    episode_description.textContent = `Episode ${i + 1}`;

    episode_info.appendChild(episode_description);

    const episode_buttons = document.createElement("div");
    episode_buttons.className = "h-8 w-full flex space-x-2 mt-2";

    const episode_watch = document.createElement("div");
    episode_watch.className =
      "h-8 w-fit pl-2 pr-3 bg-neutral-800 hover:bg-neutral-700 transition-colors rounded-md space-x-1 flex items-center";
    episode_watch.innerHTML =
      "<img src='./icons/play_arrow_24dp.png' class='h-4 w-fit object-cover' /><span class='text-sm'>Watch now</span>";

    episode_buttons.appendChild(episode_watch);

    episode_watch.addEventListener("click", () => {
      setIndex(i);
    });

    const [getExpand, setExpand, subscribeExpand] = createState(false);

    const language = document.createElement("div");
    language.className = "relative h-8";

    const language_header = document.createElement("div");
    language_header.className =
      "h-full p-2 bg-neutral-800 hover:bg-neutral-700 transition-colors rounded-md flex items-center justify-center";
    language_header.innerHTML =
      "<img src='./icons/language_24dp.svg' class='h-4 w-4' />";

    language.appendChild(language_header);

    const language_list = document.createElement("div");
    language_list.className =
      "absolute bottom-10 right-0 h-8 px-4 bg-neutral-800 rounded-lg flex items-center space-x-2 overflow-hidden";
    language_list.style.width = `calc(${episode.langs.length} * 2rem)`;

    episode.langs.map((lang) => {
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

    const asyncImage = new Image();
    asyncImage.src = episode.image;
    asyncImage.className = "w-full object-cover";

    asyncImage.addEventListener("load", () => {
      episode_image.appendChild(asyncImage);
    });

    video_player.addEventListener("timeupdate", () => {
      if (i !== getIndex()) return;

      setProgress({
        duration: Math.floor(video_player.duration / 60),
        playtime: Math.floor(video_player.currentTime / 60),
      });
    });
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

  subscribeMini((newMini) => {
    if (newMini) {
      introSkip.style.display = "none";
      selector.element.style.display = "none";
      episodeWrapper.classList.add("hidden");
      episodeToggle.style.display = "none";
      fullscreen.style.display = "none";
    } else {
      introSkip.style.display = "flex";
      selector.element.style.display = "flex";
      episodeToggle.style.display = "flex";
      fullscreen.style.display = "flex";
    }
  });

  subscribeHoster(async (newHoster) => {
    let final_url: string | null = null;
    let final_type: string | null = null;

    if (newHoster.redirect !== null) {
      try {
        if (newHoster.label.includes("Doodstream")) {
          final_url = await extract_doodstream_url(newHoster.redirect);
          final_type = "mp4";
        } else if (newHoster.label.includes("VOE")) {
          const sourceMap = await extract_voe_url(newHoster.redirect);

          if (sourceMap?.mp4) {
            final_url = sourceMap.mp4;
            final_type = "mp4";
          } else if (sourceMap?.hls) {
            final_url = sourceMap.hls;
            final_type = "hls";
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    console.log(final_url);
    video_player.src = "";

    if (Hls.isSupported() && final_type === "hls" && final_url !== null) {
      const hls = new Hls({
        enableWorker: true,
        debug: false,
      });

      hls.loadSource(final_url);
      hls.attachMedia(video_player as HTMLVideoElement);
    } else if (final_type === "mp4" && final_url !== null) {
      video_player.src = final_url;
    }
    episode_title.textContent = episodes[getIndex()].title;
  });

  subscribeIndex(async (newIndex) => {
    console.log(newIndex);

    const html = new DOMParser().parseFromString(
      await (
        await fetch(`https://aniworld.to${episodes[newIndex].redirect}`)
      ).text(),
      "text/html",
    );

    const episode_hosters = html.querySelectorAll(".watchEpisode");
    const hoster_redirects = [];

    const langs = Array.from(
      html.querySelectorAll(".changeLanguageBox img"),
    ).map((lang) => {
      const imageSrc = lang.getAttribute("src");
      let langString = "";
      switch (imageSrc) {
        case "/public/img/german.svg": {
          langString = "German";
          break;
        }
        case "/public/img/japanese-german.svg": {
          langString = "German Sub";
          break;
        }
        case "/public/img/japanese-english.svg": {
          langString = "Englisch Sub";
          break;
        }
        case "/public/img/japanese.svg": {
          langString = "Japanese";
          break;
        }
      }
      const langKey = lang.getAttribute("data-lang-key");

      return {
        lang: langString,
        key: langKey,
      };
    });

    for (let i = 0; i < episode_hosters.length; i++) {
      const hoster = episode_hosters[i];
      const hoster_name = hoster.querySelector("h4")?.textContent;
      const hoster_redirect = hoster.getAttribute("href");
      console.log(hoster_name, hoster_redirect);
      if (hoster_redirect == null || hoster_redirect == undefined) continue;
      const hosterIndex = hosters.findIndex((a) => a.label == hoster_name);
      if (hosterIndex !== -1) {
        const langIndex = langs.findIndex(
          (a) =>
            a.key ==
            hoster.parentElement?.parentElement?.getAttribute("data-lang-key"),
        );
        hoster_redirects.push({
          hoster: hosters[hosterIndex].label,
          lang: langs[langIndex],
          redirect: hoster_redirect,
        });
      }
    }

    const selectorOptions = hoster_redirects.map((hoster) => {
      return {
        label: `${hoster.hoster} ${hoster.lang.lang}`,
        redirect: hoster.redirect,
      };
    });

    selector.setOptions(selectorOptions);
    selector.set(selectorOptions[0]);
  });

  function handleKeyup(event: KeyboardEvent) {
    switch (event.keyCode) {
      case 32:
        setPlayState(!getPlayState());
        break;
      case 37:
        video_player.currentTime -= 10;
        break;
      case 39:
        video_player.currentTime += 10;
        break;
    }
  }

  player_exit.addEventListener("click", async () => {
    const playtime = Math.floor(video_player.currentTime / 60);
    const duration = Math.floor(video_player.duration / 60);
    if (episodes[getIndex()].watched !== null) {
      episodes[getIndex()]?.watched?.(duration, playtime);
    }

    player_wrapper.remove();
    player_wrapper = null;
    window.removeEventListener("keyup", handleKeyup);
    await getCurrentWindow().setFullscreen(false);
  });

  setMini(false);
  setIndex(index);
}

export default player_constructor;
