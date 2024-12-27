// @ts-ignore
import videojs from "video.js";

async function player_constructor(url: String, callback: any, playtime: any) {
  const player_wrapper = document.createElement("div");
  player_wrapper.className = "absolute inset-0 z-40 bg-neutral-900";

  document.body.appendChild(player_wrapper);

  const player_exit = document.createElement("div");
  player_exit.className =
    "absolute z-50 top-0 left-0 m-4 h-4 w-4 p-4 flex items-center justify-center rounded-full bg-neutral-900";
  player_exit.innerHTML =
    "<img src='../assets/close_24dp.png' class='min-h-4 min-w-4' />";

  player_wrapper.appendChild(player_exit);

  let html = new DOMParser().parseFromString(
    await (await fetch(`https://aniworld.to${url}`)).text(),
    "text/html",
  );

  var video_redirect = html
    .querySelector(".watchEpisode")
    ?.getAttribute("href");

  console.log(video_redirect);

  html = new DOMParser().parseFromString(
    await (await fetch(`https://aniworld.to${video_redirect}`)).text(),
    "text/html",
  );

  const video_player = document.createElement("video");
  video_player.className = "video_player video-js h-full w-full";
  video_player.controls = true;
  video_player.autoplay = true;
  video_player.currentTime = playtime * 60;
  player_wrapper.appendChild(video_player);

  let player = videojs(video_player);

  const redirectScript = Array.from(html.querySelectorAll("script")).find(
    (script) => script.text.includes("window.location.href"),
  );
  let redirectSource = redirectScript?.textContent;

  const indexStart = redirectSource?.indexOf("window.location.href = '");
  const indexEnd = redirectSource?.indexOf(";", indexStart);

  if (!indexStart || !indexEnd) return;
  redirectSource = redirectSource?.substring(indexStart + 24, indexEnd - 1);

  console.log(redirectSource);

  if (!redirectSource) return;

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

  if (!startIndex || !endIndex) return;

  source = source?.substring(startIndex, endIndex);
  source = source?.replace("var sources = ", "");
  source = source?.replace(/'/g, '"').replace(/\\n/g, "").replace(/\\/g, "");

  source = source?.substring(1);
  source = source?.slice(0, -1);
  source = source?.trim();
  source = source?.slice(0, -1);
  source = "{" + source + "}";
  const parsed = JSON.parse(source);

  const hls = atob(parsed.hls);
  console.log(hls);

  player.src({ src: hls });

  player_exit.addEventListener("click", () => {
    const playtime = Math.floor(video_player.currentTime / 60);
    const duration = Math.floor(video_player.duration / 60);

    callback(duration, playtime);
    player_wrapper.remove();
  });
}

export default player_constructor;
