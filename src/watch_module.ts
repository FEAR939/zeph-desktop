import { fetch } from "@tauri-apps/plugin-http";
import createState from "./createstate.js";
import player_constructor from "./player_module.js";
import { anime_data, season, api_episode, episode } from "./types.js";
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
    const season_redirect = season_node.getAttribute("href");

    seasons.push({
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
        await fetch("http://animenetwork.org/get-seen", {
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
  let mylist_callback: ((method: string, data: anime_data) => void) | null =
    null;
  let current_callback: ((redirect: string, image: string) => void) | null =
    null;

  const build = async (url: string) => {
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
    const details = cache.get("details");

    if (current_callback == null) return;
    current_callback(current_url, details.title);

    const detail_wrapper = document.createElement("div");
    detail_wrapper.className =
      "absolute inset-0 z-40 flex justify-center backdrop-brightness-50 overflow-y-auto";

    document.body.appendChild(detail_wrapper);

    const detail_node = document.createElement("div");
    detail_node.className =
      "min-h-[calc(100%-1rem)] h-fit w-[64rem] bg-[#090b0c] border border-white/15 mt-4 overflow-hidden rounded-t-lg border-box";

    detail_wrapper.appendChild(detail_node);

    detail_wrapper.addEventListener("click", (e) => {
      const target = e.target as Node;
      if (!detail_node.contains(target)) {
        detail_wrapper.remove();
      }
    });

    const detail_top = document.createElement("div");
    detail_top.className = "relative w-full aspect-video";

    detail_node.appendChild(detail_top);

    const detail_exit = document.createElement("div");
    detail_exit.className =
      "absolute z-20 top-0 right-0 m-4 h-4 w-4 p-4 flex items-center justify-center rounded-full bg-neutral-600/75 backdrop-blur cursor-pointer";
    detail_exit.innerHTML =
      "<img src='./icons/close_24dp.png' class='min-h-4 min-w-4' />";

    detail_top.appendChild(detail_exit);

    detail_exit.addEventListener("click", () => detail_wrapper.remove());

    const detail_image = document.createElement("div");
    detail_image.className = "w-full h-full";

    detail_top.appendChild(detail_image);

    const detail_overlay = document.createElement("div");
    detail_overlay.className =
      "absolute inset-0 bg-gradient-to-t from-[#090b0c] via-[#090b0c]/60 to-transparent";

    detail_top.appendChild(detail_overlay);

    const detail_stats = document.createElement("div");
    detail_stats.className = "absolute bottom-0 left-0 right-0 p-8";

    detail_top.appendChild(detail_stats);

    const detail_stats_inner = document.createElement("div");
    detail_stats_inner.className = "max-w-7xl mx-auto";

    detail_stats.appendChild(detail_stats_inner);

    const detail_title = document.createElement("h1");
    detail_title.className = "text-4xl font-bold mb-4";
    detail_title.textContent = details.title;

    detail_stats_inner.appendChild(detail_title);

    const detail_stats_list = document.createElement("div");
    detail_stats_list.className = "flex items-center space-x-4 mb-4";

    detail_stats_inner.appendChild(detail_stats_list);

    const detail_stats_seasoncount = document.createElement("span");
    detail_stats_seasoncount.className = "text-sm font-medium";
    detail_stats_seasoncount.textContent = `${details.seasons.length} Seasons`;

    detail_stats_list.appendChild(detail_stats_seasoncount);

    const detail_stats_outer = document.createElement("div");
    detail_stats_outer.className = "flex items-center space-x-4";

    detail_stats_inner.appendChild(detail_stats_outer);

    if (localStorage.getItem("token")) {
      const [getList, setList, subscribeList] = createState(0);
      const on_list = document.createElement("div");
      on_list.className =
        "flex items-center space-x-2 bg-neutral-900 px-2 py-1 rounded-lg cursor-pointer transition ease-in duration-300";
      on_list.textContent = "...";

      detail_stats_outer.appendChild(on_list);

      subscribeList((newList) => {
        console.log(newList);
        if (newList == 1) {
          on_list.innerHTML =
            "<img src='./icons/remove_24dp.png' class='h-4 w-4' /><span class='pr-1'>My List</span>";
        } else {
          on_list.innerHTML =
            "<img src='./icons/add_24dp.png' class='h-4 w-4' /><span class='pr-1'>My List</span>";
        }
      });

      const json = await (
        await fetch("http://animenetwork.org/get-marked", {
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
        const res = await fetch("http://animenetwork.org/handle-marked", {
          method: "POST",
          headers: {
            Authorization: localStorage.getItem("token") || "",
          },
          body: current_url.toString(),
        });
        if (!res.ok || mylist_callback == null) return;
        mylist_callback(getList() == 0 ? "add" : "rm", {
          redirect: current_url,
          image: details.image,
          title: details.title,
        });
        setList(getList() == 0 ? 1 : 0);
      });
    }

    const detail_main = document.createElement("div");
    detail_main.className = "h-fit w-full px-4";

    detail_node.appendChild(detail_main);

    const detail_description = document.createElement("div");
    detail_description.className =
      "my-4 text-sm text-neutral-400 font-medium line-clamp-2";
    detail_description.textContent = details.desc;

    detail_main.appendChild(detail_description);

    const [getSeason, setSeason, subscribeSeason] = createState("");

    let previous = cache.get("selectedSeason")?.label || undefined;

    const selector = Selector(detail_main, details.seasons, previous);

    selector.subscribe((newValue) => {
      setSeason(newValue);
    });

    const episode_wrapper = document.createElement("div");
    episode_wrapper.className = "my-4";

    detail_main.appendChild(episode_wrapper);

    subscribeSeason(async (newSeason) => {
      episode_wrapper.innerHTML = "";
      const episode_node = document.createElement("div");
      episode_node.className = "h-32 rounded-lg overflow-hidden animate-pulse";
      episode_node.innerHTML =
        "<div class='h-full w-full bg-neutral-800'></div>";

      episode_wrapper.appendChild(episode_node);

      let episodes;

      cache.set("selectedSeason", newSeason);
      if (!cache.get(`episodes-${newSeason}`)) {
        episodes = await get_episodes(newSeason, details.imdb);
        cache.set(`episodes-${newSeason}`, episodes);
        console.log(cache);
      } else {
        episodes = cache.get(`episodes-${newSeason}`);
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

    detail_image.appendChild(detail_trailer);

    if (cache.get("episodes")) {
      render_episodes(cache.get("episodes"));
    }
  };

  const setParams = (
    ml_callback: (method: string, data: anime_data) => Promise<void>,
    c_callback: (url: string, image: string) => void,
  ) => {
    mylist_callback = ml_callback;
    current_callback = c_callback;
  };

  return {
    build: build,
    setParams: setParams,
  };
}

export default watch_constructor;
