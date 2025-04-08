import createState from "./createstate";
import { fetch } from "@tauri-apps/plugin-http";

export default function searchModule(
  parent: HTMLElement,
  trigger: HTMLElement,
  watch_callback: (redirect: string) => void,
) {
  const searchWrapper = document.createElement("div");
  searchWrapper.className =
    "absolute z-90 inset-0 m-auto max-h-96 h-fit max-w-[calc(100%-4rem)] w-[600px] bg-[rgb(6,6,6)] rounded-xl shadow-xl hidden outline outline-[hsla(0,0%,0%,0.15)]";

  const searchHeader = document.createElement("div");
  searchHeader.className = "h-12 w-full px-4 py-2 flex items-center space-x-2";
  searchHeader.innerHTML =
    "<img src='./icons/search_24dp.svg' alt='Search Icon' class='h-4 w-4'>";

  const searchInput = document.createElement("input");
  searchInput.className = "h-6 w-full outline-none";
  searchInput.placeholder = "Search...";

  searchHeader.appendChild(searchInput);

  searchWrapper.appendChild(searchHeader);

  const [getResults, setResults, subscribeResults] = createState([]);

  const searchResults = document.createElement("div");
  searchResults.className =
    "max-h-64 h-fit w-full border-t border-b border-[#333333] overflow-hidden overflow-y-scroll";
  searchResults.innerHTML =
    "<div class='p-4 flex flex-col items-center space-y-2'><img src='./icons/search_24dp.svg' alt='Image' class='h-8 w-8'/><div>No results yet.</div><div class='text-[#a0a0a0] text-sm text-center w-1/2'>Try adjusting your search to find what you're looking for.</div></div>";

  searchWrapper.appendChild(searchResults);

  const searchFooter = document.createElement("div");
  searchFooter.className = "h-12 w-full px-4 py-2 flex items-center";
  searchFooter.innerHTML = `<div>No results yet.</div>`;

  searchWrapper.appendChild(searchFooter);

  parent.appendChild(searchWrapper);

  subscribeResults((newResults) => {
    searchResults.innerHTML = "";
    searchFooter.innerHTML = `<div>${newResults.length} results</div>`;
    newResults.map((result) => {
      const resultElement = document.createElement("div");
      resultElement.className =
        "px-4 py-2 cursor-pointer border-t border-[#333333]";
      resultElement.innerHTML = `<div class='truncate'>${result.title.replace("<em>", "").replace("</em>", "")}</div>`;
      searchResults.appendChild(resultElement);

      resultElement.addEventListener("click", () => {
        watch_callback(result.link);
        toggleHidden();
      });
    });
  });

  searchInput.addEventListener("keyup", async (e: KeyboardEvent) => {
    if (e.keyCode !== 13 || searchInput.value.trim().length === 0) return;
    const results = await search(searchInput.value);
    setResults(results);
  });

  function toggleHidden() {
    searchWrapper.classList.toggle("hidden");
    if (!searchWrapper.classList.contains("hidden")) searchInput.focus();
  }

  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
      e.preventDefault();
      toggleHidden();
    } else if (
      !searchWrapper.classList.contains("hidden") &&
      e.keyCode === 27
    ) {
      toggleHidden();
    }
  });

  window.addEventListener("mousedown", (e: MouseEvent) => {
    if (
      searchWrapper.classList.contains("hidden") ||
      (e.target as Node).parentElement === trigger
    )
      return;

    if (
      e.target === searchWrapper ||
      searchWrapper.contains(e.target as Node) ||
      (e.target as HTMLElement).getAttribute("role") === "searchTrigger"
    )
      return;
    toggleHidden();
  });

  trigger.addEventListener("click", () => {
    toggleHidden();
  });

  return {
    toggle: toggleHidden,
  };
}

async function search(query: string) {
  const formData = new FormData();
  formData.append("keyword", query.trim());

  let results = await (
    await fetch("https://aniworld.to/ajax/search", {
      method: "POST",
      body: new URLSearchParams(formData as unknown as Record<string, string>),
    })
  ).json();

  results = results.filter((result) => {
    if (!result.link.includes("/anime/stream/")) {
      return false;
    } else {
      return true;
    }
  });

  return results;
}
