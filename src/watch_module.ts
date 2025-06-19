import { fetch } from "@tauri-apps/plugin-http";
import createState from "./createstate.js";
import player_constructor from "./player_module.js";
import { season, api_episode, episode } from "./types.js";
import { Episode } from "./components/episode.js";
import { Selector } from "./components/selector.js";

async function get_details(url: string) {
  const response = (await fetch(`https://aniworld.to${url}`)).text();

  if (!response) throw new Error();

  const html = new DOMParser().parseFromString(await response, "text/html");

  const title = html.querySelector(".series-title h1")?.textContent || "";
  const desc =
    html.querySelector(".seri_des")?.getAttribute("data-full-description") ||
    "";
  const image =
    html.querySelector(".seriesCoverBox img")?.getAttribute("data-src") || "";
  const rating =
    html.querySelector(".starRatingResult strong")?.textContent?.trim() || "";
  const imdb_link =
    html.querySelector(".imdb-link")?.getAttribute("href") || "";
  const season_nodes =
    html
      .querySelectorAll(".hosterSiteDirectNav ul")[0]
      ?.querySelectorAll("a") || [];

  const seasons: season[] = [];

  season_nodes.forEach((season_node) => {
    const season_label = season_node.textContent;
    let season_title = season_label;
    if (!isNaN(season_title)) season_title = `Staffel ${season_title}`;
    const season_redirect = season_node.getAttribute("href");

    seasons.push({
      title: season_title || "",
      label: season_label || "",
      redirect: season_redirect || "",
    });
  });

  return {
    title: title,
    desc: desc,
    image: image,
    rating: rating,
    imdb: imdb_link,
    seasons: seasons,
  };
}

async function get_episodes(season: season, imdb: string) {
  try {
    const fetchURLs = [`https://aniworld.to${season.redirect}`];

    if (imdb) {
      fetchURLs.push(`${imdb}/episodes/?season=${season.label}`);
    }

    const [text, imdb_text = ""] = await Promise.all(
      fetchURLs.map(async (url: string) => {
        return await (await fetch(url)).text();
      }),
    );

    const html = new DOMParser().parseFromString(text, "text/html");
    const episodes_nodes = html.querySelectorAll("tbody tr");

    let episode_watched: api_episode[] = [];
    if (localStorage.getItem("token")) {
      episode_watched = await (
        await fetch(`${localStorage.getItem("api_url")}/get-seen`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token") || "",
          },
          body: JSON.stringify(
            [...episodes_nodes].map((episode) =>
              episode.getAttribute("data-episode-id"),
            ),
          ),
        })
      ).json();
    }

    const imdb_html = new DOMParser().parseFromString(imdb_text, "text/html");

    let imdb_season_images: NodeListOf<Element> | null = null;

    if (imdb_html) {
      imdb_season_images = imdb_html.querySelectorAll(
        "article > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > img:nth-child(1)",
      );
    }

    const episodes: episode[] = [];

    episodes_nodes.forEach(async (item, i) => {
      // get episode redirect
      const anchor = item.querySelector(".seasonEpisodeTitle a");

      const index = episode_watched.findIndex(
        (a: api_episode) =>
          a.episode_id == episodes_nodes[i].getAttribute("data-episode-id"),
      );

      const redirect = anchor?.getAttribute("href");
      const title = anchor?.textContent;
      let image = "";
      const duration = episode_watched[index]?.watch_duration || 0;
      const playtime = episode_watched[index]?.watch_playtime || 0;
      const id = episodes_nodes[i].getAttribute("data-episode-id");
      const languages = Array.from(
        episodes_nodes[i]?.querySelectorAll(".flag"),
      ).map((item) => {
        const lang = item.getAttribute("src");
        if (lang !== null && typeof lang !== "undefined") return lang;
        return "";
      });

      if (imdb_season_images !== null && i < imdb_season_images.length) {
        image = imdb_season_images[i].getAttribute("src") || "";
      }

      episodes.push({
        redirect: redirect || "",
        title: title || "",
        image: image,
        duration: duration,
        playtime: playtime,
        id: id || "",
        langs: languages || [],
        watched: null,
      });
    });

    return episodes;
  } catch (e) {
    console.error(e);
  }
}

function watch_constructor() {
  const cache = new Map<string, any>();
  let loading = false;
  let current_url: string = "";
  let current_callback:
    | ((redirect: string, image: string, title: string) => void)
    | null = null;

  let detail_wrapper = undefined;
  let detail_node = undefined;

  const build = async (url: string) => {
    detail_wrapper = document.createElement("div");
    detail_wrapper.className =
      "absolute inset-0 z-40 flex justify-center bg-neutral-950/60 backdrop-blur-xl overflow-y-auto";

    document.body.appendChild(detail_wrapper);

    detail_node = document.createElement("div");
    detail_node.className =
      "relative min-h-[calc(100%-1rem)] h-fit w-[64rem] max-w-full mt-4 overflow-hidden border-box flex flex-col justify-center";

    detail_wrapper.appendChild(detail_node);

    detail_wrapper.addEventListener("click", (e) => {
      const target = e.target as Node;
      if (!detail_node.contains(target)) {
        detail_wrapper.remove();
      }
    });

    detail_node.innerHTML = `
      <div class="grid min-h-[140px] w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
        <svg class="text-gray-300 animate-spin" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
          width="24" height="24">
          <path
            d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
            stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
          <path
            d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
            stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-900">
          </path>
        </svg>
      </div>
    `;

    if (loading) return;

    if (cache.size == 0 || url != current_url) {
      cache.clear();
      loading = true;
      console.log("INFO: building cache");
      const details = await get_details(url);
      cache.set("details", details);
      loading = false;
      current_url = url;
    } else {
      console.log("INFO: reusing cache");
    }

    console.log("INFO: cache loaded");
    console.log(cache);

    render();
  };

  const render = async () => {
    if (detail_node == undefined) return;
    detail_node.innerHTML = "";
    console.log("INFO: rendering details");

    const details = cache.get("details");

    if (current_callback == null) return;
    current_callback(current_url, details.image, details.title);

    const detail_exit = document.createElement("div");
    detail_exit.className =
      "h-8 w-8 ml-4 mt-4 mb-4 flex items-center justify-center cursor-pointer";
    detail_exit.innerHTML =
      "<img src='./icons/keyboard_backspace_24dp.png' class='h-full w-full' />";

    detail_node.appendChild(detail_exit);

    detail_exit.addEventListener("click", () => detail_wrapper.remove());

    const detail_top = document.createElement("div");
    detail_top.className =
      "relative w-[calc(100%-2rem)] mx-4 aspect-video rounded-2xl overflow-hidden shadow-[4px_8px_16px_rgba(0,0,0,0.8)]";

    detail_node.appendChild(detail_top);

    const detail_image = document.createElement("div");
    detail_image.className = "w-full h-full flex items-center justify-center";
    detail_image.innerHTML = `
      <div class="grid min-h-[140px] w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
        <svg class="text-gray-300 animate-spin" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
          width="24" height="24">
          <path
            d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
            stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
          <path
            d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
            stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-900">
          </path>
        </svg>
      </div>
    `;

    detail_top.appendChild(detail_image);

    const detail_main = document.createElement("div");
    detail_main.className = "h-fit w-full px-4 pt-2";

    detail_node.appendChild(detail_main);

    detail_main.insertAdjacentHTML(
      "beforeend",
      `<div class='text-xl font-semibold w-full truncate'>${details.title}</div>`,
    );

    const detail_bar = document.createElement("div");
    detail_bar.className = "w-full flex space-x-2 mt-2";

    detail_main.appendChild(detail_bar);

    if (localStorage.getItem("token")) {
      const [getList, setList, subscribeList] = createState(0);
      const on_list = document.createElement("div");
      on_list.className =
        "flex items-center space-x-1 bg-neutral-950 py-2 px-4 rounded-lg cursor-pointer transition-colors";
      on_list.textContent = "...";

      detail_bar.appendChild(on_list);

      subscribeList((newList) => {
        console.log(newList);
        if (newList == 1) {
          on_list.classList.add(
            "bg-gradient-to-r",
            "from-[rgb(54,95,215)]",
            "to-[rgb(143,155,215)]",
          );
          on_list.classList.remove("outline", "outline-neutral-800");
          on_list.innerHTML =
            "<span class='text-xs pr-1 font-semibold'>Subscribed</span>";
        } else {
          on_list.classList.add("outline", "outline-neutral-800");
          on_list.classList.remove(
            "bg-gradient-to-r",
            "from-[rgb(54,95,215)]",
            "to-[rgb(143,155,215)]",
          );
          on_list.innerHTML =
            "<span class='text-xs pr-1 font-semibold'>Subscribe</span>";
        }
      });

      const json = await (
        await fetch(`${localStorage.getItem("api_url")}/get-marked`, {
          method: "POST",
          headers: {
            Authorization: localStorage.getItem("token") || "",
          },
          body: current_url.toString(),
        })
      ).json();
      console.log(json);
      if (json[0]?.is_in_list) {
        setList(json[0].is_in_list);
      } else {
        setList(0);
      }

      on_list.addEventListener("click", async () => {
        const res = await fetch(
          `${localStorage.getItem("api_url")}/handle-marked`,
          {
            method: "POST",
            headers: {
              Authorization: localStorage.getItem("token") || "",
            },
            body: current_url.toString(),
          },
        );
        if (!res.ok == null) return;

        setList(getList() == 0 ? 1 : 0);
      });
    }

    const detail_description_wrapper = document.createElement("div");
    detail_description_wrapper.className =
      "p-4 rounded-xl bg-neutral-950/60 backdrop-blur-xl my-4";

    detail_main.appendChild(detail_description_wrapper);

    const desc = document.createElement("div");
    desc.className = "text-sm line-clamp-3";
    desc.innerHTML = `<div class="font-semibold">${details.seasons.length} Seasons</div></div>${details.desc}</div>`;

    detail_description_wrapper.appendChild(desc);

    const desc_expand = document.createElement("div");
    desc_expand.className = "mt-1 w-fit text-xs font-semibold cursor-pointer";
    desc_expand.textContent = "Show more";

    detail_description_wrapper.appendChild(desc_expand);

    const [getMore, setMore, subscribeMore] = createState(false);

    subscribeMore((more) => {
      if (more) {
        desc.classList.remove("line-clamp-3");
        desc_expand.textContent = "Show less";
      } else {
        desc.classList.add("line-clamp-3");
        desc_expand.textContent = "Show more";
      }
    });

    desc_expand.addEventListener("click", (e) => {
      e.stopPropagation();
      setMore(!getMore());
    });

    const [getSeason, setSeason, subscribeSeason] = createState("");

    let previous = cache.get("selectedSeason")?.label || undefined;

    detail_main.insertAdjacentHTML(
      "beforeend",
      "<div class='text-l font-semibold mb-2'>Episodes</div>",
    );

    const seasonRow = document.createElement("div");
    seasonRow.className = "flex space-x-2 my-4";

    detail_main.appendChild(seasonRow);

    const selector = Selector(seasonRow, details.seasons, previous);

    selector.subscribe((newValue) => {
      setSeason(newValue);
    });

    console.log(cache);

    const season_reset = document.createElement("div");
    season_reset.className =
      "px-2 py-1 bg-neutral-950/60 backdrop-blur-xl rounded-lg cursor-pointer flex space-x-2 items-center";
    season_reset.innerHTML =
      "<img src='./icons/replay_24dp.svg' class='h-4 w-4 object-cover' /><span>Rewatch</span>";

    seasonRow.appendChild(season_reset);

    season_reset.addEventListener("click", () => {
      if (localStorage.getItem("token") === undefined) return;
      const season_reset_modal = document.createElement("div");
      season_reset_modal.className =
        "absolute z-50 inset-0 m-auto h-64 sm:h-fit w-96 max-w-3/4 p-4 bg-neutral-950/60 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center";

      console.log(cache.get("selectedSeason"));
      if (cache.get("selectedSeason") === undefined) {
        season_reset_modal.textContent = "No season selected";
        const close_button = document.createElement("button");
        close_button.className =
          "bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 mt-4 cursor-pointer";
        close_button.textContent = "Ok";
        close_button.addEventListener("click", () => {
          season_reset_modal.remove();
        });
        season_reset_modal.appendChild(close_button);
      } else {
        season_reset_modal.innerHTML = `
          <span class='text-red-500'>Are you sure?</span><br><span>Resetting the season will delete all your progress.</span>
        `;

        const row = document.createElement("div");
        row.className = "flex space-x-2 my-4";
        season_reset_modal.appendChild(row);

        const close_button = document.createElement("button");
        close_button.className =
          "bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 mt-4 cursor-pointer";
        close_button.textContent = "Cancel";
        close_button.addEventListener("click", () => {
          season_reset_modal.remove();
        });
        row.appendChild(close_button);

        const confirm_button = document.createElement("button");
        confirm_button.className =
          "bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 mt-4 cursor-pointer";
        confirm_button.textContent = "Reset";
        confirm_button.addEventListener("click", () => {
          const seasonkey = cache.get("selectedSeason");
          const episodes = cache.get(`episodes-${seasonkey}`);
          console.log(episodes);
          episodes.forEach((ep) => {
            ep.watched(0, 0, 0, true);
          });
          season_reset_modal.remove();
        });
        row.appendChild(confirm_button);
      }

      document.body.appendChild(season_reset_modal);
    });

    const episode_wrapper = document.createElement("div");
    episode_wrapper.className =
      "flex space-x-2 my-4 overflow-y-scroll rounded-2xl";

    detail_main.appendChild(episode_wrapper);

    const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);

    subscribeSeason(async (newSeason) => {
      episode_wrapper.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const episode_node = document.createElement("div");
        episode_node.className =
          "aspect-[500/281] rounded-xl overflow-hidden animate-pulse";
        episode_node.innerHTML =
          "<div class='h-full w-full bg-zinc-800'></div>";

        if (isMobileDevice) {
          episode_node.classList.add("h-32");
        } else {
          episode_node.classList.add("h-38");
        }

        episode_wrapper.appendChild(episode_node);
      }

      let episodes;

      cache.set("selectedSeason", newSeason.redirect);
      if (!cache.get(`episodes-${newSeason.redirect}`)) {
        episodes = await get_episodes(newSeason, details.imdb);
        cache.set(`episodes-${newSeason.redirect}`, episodes);
        console.log(cache);
      } else {
        episodes = cache.get(`episodes-${newSeason.redirect}`);
      }

      render_episodes(episodes);
    });

    if (cache.get("selectedSeason")) {
      setSeason(cache.get("selectedSeason"));
    }

    function render_episodes(episodes: episode[]) {
      episode_wrapper.innerHTML = "";

      const player_episodes: episode[] = [];

      function call_player(index: number) {
        player_constructor(player_episodes, index);
      }

      episodes.forEach((episode: episode, i: number) => {
        Episode(
          episode,
          episode_wrapper,
          i,
          cache,
          player_episodes,
          episodes,
          call_player,
          current_url,
        );
      });
    }

    if (!cache.get("trailer")) {
      if (!details.imdb) return;
      let html;
      try {
        html = new DOMParser().parseFromString(
          await (await fetch(details.imdb)).text(),
          "text/html",
        );
      } catch (e) {
        console.log(e);
      }

      if (!html) return;

      const script = html.querySelector('script[type="application/json"]');
      if (!script) return;
      cache.set(
        "trailer",
        JSON.parse(script.textContent || "")?.props?.pageProps?.aboveTheFoldData
          ?.primaryVideos?.edges[0]?.node?.playbackURLs[0]?.url,
      );
    }

    const detail_trailer = document.createElement("video");
    detail_trailer.className = "h-full w-full";
    detail_trailer.src = cache.get("trailer");
    detail_trailer.autoplay = true;
    detail_trailer.loop = true;
    detail_trailer.muted = true;

    detail_image.innerHTML = "";
    detail_image.appendChild(detail_trailer);

    if (cache.get("episodes")) {
      render_episodes(cache.get("episodes"));
    }
  };

  const setParams = (
    c_callback: (url: string, image: string, title: string) => void,
  ) => {
    current_callback = c_callback;
  };

  return {
    build: build,
    setParams: setParams,
  };
}

export default watch_constructor;
