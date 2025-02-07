import { fetch } from "@tauri-apps/plugin-http";
import { search_result } from "./types";

export function Search(
  top_node: HTMLElement,
  watch_callback: (redirect: string) => void,
) {
  const search_node = document.createElement("div");
  search_node.className =
    "relative group h-8 w-96 border border-neutral-800 rounded-xl max-w-[50%]";

  top_node.appendChild(search_node);

  const search_wrapper = document.createElement("div");
  search_wrapper.className =
    "absolute inset-[1px] flex items-center space-x-2 px-1 rounded-[18px] overflow-hidden";
  search_wrapper.innerHTML =
    "<img src='./icons/icons8-search.svg' class='h-4 w-4 ml-1 object-cover' />";

  search_node.appendChild(search_wrapper);

  const search_input = document.createElement("input");
  search_input.className =
    "h-full w-full bg-transparent border-0 outline-0 placeholder:text-neutral-500 text-xs text-neutral-500 font-[Inter]";
  search_input.placeholder = "Search";
  search_input.accessKey = "f";

  search_wrapper.appendChild(search_input);

  const search_shortcut = document.createElement("div");
  search_shortcut.className =
    "relative flex items-center justify-center h-6 px-2";
  search_shortcut.innerHTML =
    "<img src='./icons/keyboard_command_key_24dp.png' class='h-4 w-4 object-cover' /><span class='text-base'>F</span>";

  search_wrapper.appendChild(search_shortcut);

  const search_results = document.createElement("div");
  search_results.className =
    "absolute left-0 right-0 top-16 max-h-96 h-0 py-2 overflow-hidden rounded-xl bg-neutral-950 border border-neutral-800 transition-all ease-in-out duration-300 -translate-y-4";
  search_results.style.opacity = "0";
  search_results.style.transform = "translateY(-1rem)";

  search_node.appendChild(search_results);

  let timeout: NodeJS.Timeout;

  function showResults() {
    clearTimeout(timeout);
    search_results.style.opacity = "100";
    search_results.style.transform = "translateY(0)";
    search_results.classList.remove("h-0");
    search_results.classList.add("h-fit");
  }

  function hideResults() {
    search_results.style.opacity = "0";
    search_results.style.transform = "translateY(-1rem)";
    timeout = setTimeout(() => {
      search_results.classList.remove("h-fit");
      search_results.classList.add("h-0");
    }, 300);
  }

  let isFocus = false;
  let hasResults = false;

  search_node.addEventListener("mouseenter", () => {
    if (!hasResults) return;
    showResults();
  });

  search_input.addEventListener("focus", () => {
    isFocus = true;
    if (!hasResults) return;
    showResults();
  });

  search_node.addEventListener("mouseleave", () => {
    if (isFocus) return;
    hideResults();
  });

  search_input.addEventListener("focusout", () => {
    isFocus = false;
    hideResults();
  });

  const search_results_inner = document.createElement("div");
  search_results_inner.className =
    "h-fit max-h-[calc(24rem-2rem)] w-full rounded-lg overflow-y-scroll";

  search_results.appendChild(search_results_inner);

  search_input.addEventListener("keyup", async (event) => {
    if (event.key !== "Enter" || search_input.value.trim().length == 0) return;

    let searchString = search_input.value.trim();

    const tags = [];
    for (let i = 0; i < searchString.length; i++) {
      if (search_input.value[i] == "#") {
        const tagEnd = searchString.indexOf(" ", i);
        tags.push(
          searchString.substring(
            i,
            tagEnd == -1 ? searchString.length : tagEnd,
          ),
        );
        searchString = searchString.substring(tagEnd, searchString.length);
      }
    }

    let results = [];

    if (tags.includes("#mylist")) {
      let storage = null;
      let current = null;
      if (localStorage.getItem("mylist")) {
        storage = JSON.parse(localStorage.getItem("mylist") || "");
        current = storage.mylist.items;
      }

      const index = [];

      for (let i = 0; i < current.length; i++) {
        let pos = -1;

        pos = current[i].title
          .toLowerCase()
          .search(searchString.toLowerCase().trim());

        if (pos !== -1) {
          index.push(i);
        }
      }
      if (index.length) {
        index.forEach((i) => {
          results.push({
            link: current[i].redirect,
            title: current[i].title,
          });
        });
      }
    } else {
      const formData = new FormData();
      formData.append("keyword", searchString.trim());

      results = await (
        await fetch("https://aniworld.to/ajax/search", {
          method: "POST",
          body: new URLSearchParams(
            formData as unknown as Record<string, string>,
          ),
        })
      ).json();
    }

    search_results_inner.innerHTML = "";
    if (results.length !== 0) {
      hasResults = true;
      showResults();
    }

    results.forEach((item: search_result) => {
      if (!item.link.includes("/anime/stream/")) return;

      const search_result = document.createElement("div");
      search_result.className =
        "w-auto px-2 py-1 mx-1 flex items-center cursor-pointer text-xs text-neutral-300";
      search_result.innerHTML = `<div class='truncate'>${item.title.replace("<em>", "").replace("</em>", "")}</div>`;

      search_results_inner.appendChild(search_result);

      search_result.addEventListener("click", () => watch_callback(item.link));
    });
  });
}
