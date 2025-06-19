import createState from "./createstate";
import { fetch } from "@tauri-apps/plugin-http";

export default function searchModule(
  parent: HTMLElement,
  trigger: HTMLElement,
  watch_callback: (redirect: string) => void,
) {
  const blurWrapper = document.createElement("div");
  blurWrapper.className =
    "absolute inset-0 bg-neutral-950/60 backdrop-blur-xl flex items-center justify-center hidden transition-opacity duration-300";

  const searchWrapper = document.createElement("div");
  searchWrapper.className =
    "max-h-96 h-fit max-w-[calc(100%-4rem)] w-[600px] bg-neutral-950 rounded-2xl shadow-xl outline outline-neutral-800";

  blurWrapper.appendChild(searchWrapper);

  const searchHeader = document.createElement("div");
  searchHeader.className = "h-12 w-full px-4 py-2 flex items-center space-x-2";
  searchHeader.innerHTML =
    "<img src='./icons/search_24dp.svg' alt='Search Icon' class='h-6 w-6'>";

  const searchInput = document.createElement("input");
  searchInput.className = "h-6 w-full outline-none";
  searchInput.placeholder = "Search...";

  searchHeader.appendChild(searchInput);

  searchWrapper.appendChild(searchHeader);

  const [getResults, setResults, subscribeResults] = createState([]);

  const searchResults = document.createElement("div");
  searchResults.className =
    "max-h-64 h-fit w-full p-2 space-y-2 border-t border-b border-[#333333] overflow-hidden overflow-y-scroll";
  searchResults.innerHTML =
    "<div class='p-4 flex flex-col items-center space-y-2'><img src='./icons/search_24dp.svg' alt='Image' class='h-8 w-8'/><div>No results yet.</div><div class='text-[#a0a0a0] text-sm text-center w-1/2'>Try adjusting your search to find what you're looking for.</div></div>";

  searchWrapper.appendChild(searchResults);

  const searchFooter = document.createElement("div");
  searchFooter.className = "h-12 w-full px-4 py-2 flex items-center";

  searchWrapper.appendChild(searchFooter);

  const FooterResultCount = document.createElement("div");
  FooterResultCount.textContent = "No results yet";

  searchFooter.appendChild(FooterResultCount);

  const FooterQuit = document.createElement("div");
  FooterQuit.innerHTML =
    "<div class='px-2 py-1 bg-neutral-800 rounded text-sm'>ESC</div><div>Close</div>";
  FooterQuit.className = "ml-auto flex items-center space-x-2 cursor-pointer";
  FooterQuit.addEventListener("click", () => {
    toggleHidden();
  });

  searchFooter.appendChild(FooterQuit);

  parent.appendChild(blurWrapper);

  subscribeResults((newResults) => {
    searchResults.innerHTML = "";
    FooterResultCount.textContent = `${newResults.length} results`;
    newResults.map((result) => {
      const resultElement = document.createElement("div");
      resultElement.className =
        "px-4 py-2 cursor-pointer bg-neutral-900 rounded-lg";
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
    if (searchInput.value === "/cache clear") {
      localStorage.removeItem("categories");
      localStorage.removeItem("calendar");
      return toggleHidden();
    }
    const results = await search(searchInput.value);
    setResults(results);
  });

  function toggleHidden() {
    blurWrapper.classList.toggle("hidden");
    if (!blurWrapper.classList.contains("hidden")) searchInput.focus();
  }

  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
      e.preventDefault();
      toggleHidden();
    } else if (!blurWrapper.classList.contains("hidden") && e.keyCode === 27) {
      toggleHidden();
    }
  });

  window.addEventListener("mousedown", (e: MouseEvent) => {
    if (
      blurWrapper.classList.contains("hidden") ||
      (e.target as Node).parentElement === trigger
    )
      return;

    if (
      e.target === blurWrapper ||
      blurWrapper.contains(e.target as Node) ||
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
