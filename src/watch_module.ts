import createState from "./createstate.js";
import player_constructor from "./player_module.js";

async function get_details(url: String) {
  try {
    let response = (await fetch(`https://aniworld.to${url}`)).text();

    const html = new DOMParser().parseFromString(await response, "text/html");

    const title = html.querySelector(".series-title h1")?.textContent;
    const desc = html
      .querySelector(".seri_des")
      ?.getAttribute("data-full-description");
    const image = html
      .querySelector(".seriesCoverBox img")
      ?.getAttribute("data-src");
    const rating = html
      .querySelector(".starRatingResult strong")
      ?.textContent?.trim();
    const imdb_link = html.querySelector(".imdb-link")?.getAttribute("href");
    const season_nodes = html
      .querySelectorAll(".hosterSiteDirectNav ul")[0]
      ?.querySelectorAll("a");

    const seasons = <any>[];

    season_nodes.forEach((season_node) => {
      const season_label = season_node.textContent;
      const season_redirect = season_node.getAttribute("href");

      seasons.push({
        label: season_label,
        redirect: season_redirect,
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
  } catch (e) {
    console.error(e);
  }
}

async function get_episodes(season: any, imdb: String) {
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

    let episode_watched = <any>[];
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

    let imdb_season_images = <any>[];

    if (imdb_html) {
      imdb_season_images = imdb_html.querySelectorAll(
        "article > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > img:nth-child(1)",
      );
    }

    const episodes = <any>[];

    episodes_nodes.forEach(async (item, i) => {
      // get episode redirect
      const anchor = item.querySelector(".seasonEpisodeTitle a");

      const index = episode_watched.findIndex(
        (a: any) =>
          a.episode_id == episodes_nodes[i].getAttribute("data-episode-id"),
      );

      let redirect = anchor?.getAttribute("href");
      let title = anchor?.textContent;
      let image = "";
      let duration = episode_watched[index]?.watch_duration || 0;
      let playtime = episode_watched[index]?.watch_playtime || 0;
      let id = episodes_nodes[i].getAttribute("data-episode-id");

      if (i < imdb_season_images.length) {
        image = imdb_season_images[i].getAttribute("src") || "";
      }

      episodes.push({
        redirect: redirect,
        title: title,
        image: image,
        duration: duration,
        playtime: playtime,
        id: id,
      });
    });

    return episodes;
  } catch (e) {
    console.error(e);
  }
}

function watch_constructor() {
  let cache = new Map<String, any>();
  let loading = false;
  let current_url: String = "";
  let mylist_callback: any = null;

  const build = async (url: String) => {
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

    const detail_wrapper = document.createElement("div");
    detail_wrapper.className =
      "absolute inset-0 z-20 flex justify-center backdrop-brightness-50 overflow-y-auto";

    document.body.appendChild(detail_wrapper);

    const detail_node = document.createElement("div");
    detail_node.className =
      "min-h-[calc(100%-1rem)] h-fit w-[64rem] bg-neutral-900 mt-4 overflow-hidden rounded-t-lg border-box";

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
      "absolute z-20 top-0 right-0 m-4 h-4 w-4 p-4 flex items-center justify-center rounded-full bg-neutral-900";
    detail_exit.innerHTML =
      "<img src='../assets/close_24dp.png' class='min-h-4 min-w-4' />";

    detail_top.appendChild(detail_exit);

    detail_exit.addEventListener("click", () => detail_wrapper.remove());

    const detail_image = document.createElement("div");
    detail_image.className = "w-full h-full";

    detail_top.appendChild(detail_image);

    const detail_overlay = document.createElement("div");
    detail_overlay.className =
      "absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent";

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
    detail_stats_seasoncount.className = "text-sm";
    detail_stats_seasoncount.textContent = `${details.seasons.length} Seasons`;

    detail_stats_list.appendChild(detail_stats_seasoncount);

    const detail_stats_outer = document.createElement("div");
    detail_stats_outer.className = "flex items-center space-x-4";

    detail_stats_inner.appendChild(detail_stats_outer);

    if (localStorage.getItem("token")) {
      const [getList, setList, subscribeList] = createState(0);
      const on_list = document.createElement("div");
      on_list.className =
        "flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg";
      on_list.textContent = "...";

      detail_stats_outer.appendChild(on_list);

      subscribeList((newList) => {
        console.log(newList);
        if (newList == 1) {
          on_list.innerHTML =
            "<img src='../assets/remove_24dp.png' class='h-4 w-4' /><span>My List</span>";
        } else {
          on_list.innerHTML =
            "<img src='../assets/add_24dp.png' class='h-4 w-4' /><span>My List</span>";
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
        if (!res.ok) return;
        mylist_callback(getList() == 0 ? "add" : "rm", {
          redirect: current_url,
          image: details.image,
          title: details.title,
        });
        setList(getList() == 0 ? 1 : 0);
      });
    }

    const detail_description = document.createElement("div");
    detail_description.className = "m-4 text-sm text-gray-400 line-clamp-2";
    detail_description.textContent = details.desc;

    detail_node.appendChild(detail_description);

    const [getSeason, setSeason, subscribeSeason] = createState("");

    const detail_selection = document.createElement("select");
    detail_selection.className =
      "flex items-center space-x-2 bg-neutral-800 w-48 px-4 py-2 m-4 rounded-lg border-r-8 outline-0 border-neutral-800";

    detail_node.appendChild(detail_selection);

    const detail_option = document.createElement("option");
    detail_option.selected = true;
    detail_option.disabled = true;
    detail_option.textContent = "Choose season";
    detail_selection.appendChild(detail_option);

    details.seasons.forEach((season: any, i: number) => {
      const detail_option = document.createElement("option");
      detail_option.value = i.toString();
      detail_option.textContent = season.label;

      detail_selection.appendChild(detail_option);
    });

    detail_selection.addEventListener("change", () => {
      setSeason(detail_selection.value);
    });

    const episode_wrapper = document.createElement("div");
    episode_wrapper.className = "p-4";

    detail_node.appendChild(episode_wrapper);

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
        episodes = await get_episodes(details.seasons[newSeason], details.imdb);
        cache.set(`episodes-${newSeason}`, episodes);
        console.log(cache);
      } else {
        episodes = cache.get(`episodes-${newSeason}`);
      }

      render_episodes(episodes);
    });

    if (cache.get("selectedSeason")) {
      detail_selection.value = cache.get("selectedSeason");
      setSeason(cache.get("selectedSeason"));
    }

    function render_episodes(episodes: any) {
      episode_wrapper.innerHTML = "";

      episodes.forEach((episode: any, i: number) => {
        const episode_node = document.createElement("div");
        episode_node.className =
          "group relative flex items-center h-32 cursor-pointer rounded-lg overflow-hidden hover:bg-neutral-800 transition-colors";

        episode_wrapper.appendChild(episode_node);

        const episode_number = document.createElement("div");
        episode_number.className =
          "flex-shrink-0 w-20 flex items-center justify-center text-3xl font-bold text-gray-500 group-hover:text-white transition-colors";
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
            episode.duration = newProgress.duration;
            episode.playtime = newProgress.playtime;

            cache.set(`episodes-${cache.get("selectedSeason")}`, episodes);

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
        episode_description.className =
          "mt-1 text-sm text-gray-400 line-clamp-2";
        episode_description.textContent = episode.title;

        episode_info.appendChild(episode_description);

        const watched = async (duration: number, playtime: number) => {
          console.log("callback");
          if (!localStorage.getItem("token")) return;

          const res = await fetch("http://animenetwork.org/handle-seen", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: localStorage.getItem("token") || "",
            },
            body: JSON.stringify({
              playtime: playtime,
              duration: duration,
              id: episode.id,
            }),
          });

          console.log(res);

          if (res.status == 200) {
            setProgress({ duration: duration, playtime: playtime });
          }
        };

        episode_node.addEventListener("click", () =>
          player_constructor(episode.redirect, watched, episode.playtime),
        );

        const asyncImage = new Image();
        asyncImage.src = episode.image;
        asyncImage.className = "w-full object-cover";

        asyncImage.addEventListener("load", () => {
          episode_image.appendChild(asyncImage);
        });
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

  const setParams = (callback: any) => {
    mylist_callback = callback;
  };

  return {
    build: build,
    setParams: setParams,
  };
}

export default watch_constructor;
