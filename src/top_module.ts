import { fetch } from "@tauri-apps/plugin-http";
import { open } from "@tauri-apps/plugin-shell";
import createState from "./createstate";
import { search_result } from "./types";

function top_constructor(
  top: HTMLElement,
  login_callback: (fn: () => void) => void,
  watch_callback: (redirect: string) => void,
) {
  const [getCurrent, setCurrent, subscribeCurrent] = createState({
    url: "",
    image: "",
  });

  function render() {
    const top_node = document.createElement("div");
    top_node.className =
      "relative h-full w-full flex items-center justify-center px-4 space-x-2";

    top.appendChild(top_node);

    const title = document.createElement("div");
    title.className = "absolute left-4 flex items-center space-x-2";
    title.innerHTML =
      "<img src='./icons/favicon-512x512.png' class='h-4 w-4 invert' /><span class='font-[Inter] font-medium text-lg'>hazl</span>";

    top_node.appendChild(title);

    const search_node = document.createElement("div");
    search_node.className =
      "relative group h-8 w-96 bg-white/15 rounded-[18px] max-w-[50%]";

    top_node.appendChild(search_node);

    const search_wrapper = document.createElement("div");
    search_wrapper.className =
      "absolute inset-[1px] flex items-center space-x-2 px-1 rounded-[18px] bg-[#090b0c]/90 overflow-hidden backdrop-blur";
    search_wrapper.innerHTML =
      "<img src='./icons/search_24dp.png' class='h-4 w-4 ml-1' />";

    search_node.appendChild(search_wrapper);

    const search_input = document.createElement("input");
    search_input.className =
      "flex-1 h-8 bg-transparent border-0 outline-0 placeholder:text-neutral-200 text-sm font-medium";
    search_input.placeholder = "Search for anime...";
    search_input.accessKey = "f";

    search_wrapper.appendChild(search_input);

    const search_shortcut = document.createElement("div");
    search_shortcut.className =
      "relative flex items-center justify-center h-6 px-2 bg-blue-400 rounded-full text-xs font-medium";
    search_shortcut.innerHTML =
      "<img src='./icons/keyboard_command_key_24dp.png' class='h-4 w-4' /><span>F</span>";

    search_wrapper.appendChild(search_shortcut);

    const search_shortcut_glow = document.createElement("div");
    search_shortcut_glow.className = "absolute -inset-2 bg-blue-400/75 blur-lg";

    search_shortcut.appendChild(search_shortcut_glow);

    const search_results = document.createElement("div");
    search_results.className =
      "absolute left-0 right-0 top-10 max-h-96 h-0 overflow-hidden rounded-[18px] bg-white/15 transition-all ease-in-out duration-300 -translate-y-4";
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
      "h-fit max-h-[calc(24rem-2px)] m-[1px] py-2 w-[calc(100%-2px)] bg-[#090b0c]/90 rounded-[18px] overflow-y-scroll backdrop-blur";

    search_results.appendChild(search_results_inner);

    search_input.addEventListener("keyup", async (event) => {
      if (event.key !== "Enter" || search_input.value.trim().length == 0)
        return;

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
          "h-8 w-auto px-2 mx-2 flex items-center hover:bg-white/10 transition ease-in duration-300 cursor-pointer rounded-lg";
        search_result.innerHTML = `<div class='truncate'>${item.title.replace("<em>", "").replace("</em>", "")}</div>`;

        search_results_inner.appendChild(search_result);

        search_result.addEventListener("click", () =>
          watch_callback(item.link),
        );
      });
    });

    const current_node = document.createElement("div");
    current_node.className =
      "h-8 w-16 rounded-full bg-neutral-800 cursor-pointer overflow-hidden hidden";

    top_node.appendChild(current_node);

    current_node.addEventListener("click", () => {
      watch_callback(getCurrent().url);
    });

    const current_image = document.createElement("img");
    current_image.className = "h-full w-full object-cover";

    current_node.appendChild(current_image);

    subscribeCurrent((newCurrent) => {
      current_image.src = `https://aniworld.to${newCurrent.image}`;
      current_node.classList.remove("hidden");
    });

    const account_node = document.createElement("div");
    account_node.className =
      "absolute right-4 w-8 h-8 rounded-full bg-neutral-600 flex items-center cursor-pointer";

    top_node.appendChild(account_node);

    const build_account = async () => {
      account_node.innerHTML = "";

      if (localStorage.getItem("token")) {
        const json = await (
          await fetch("http://animenetwork.org/get-avatar", {
            headers: {
              Authorization: localStorage.getItem("token") || "",
            },
          })
        ).json();

        const asyncImage = new Image();
        asyncImage.src = json.avatar_url;
        asyncImage.className = "h-full w-full rounded-full object-cover";

        asyncImage.addEventListener("load", () => {
          account_node.appendChild(asyncImage);
        });

        const [getMenuState, setMenuState, subscribeMenuState] =
          createState(false);

        const account_menu = document.createElement("div");
        account_menu.className =
          "absolute z-40 top-10 right-0 h-fit w-48 p-2 rounded-[18px] bg-[#090b0c] backdrop-blur border border-white/15 overflow-hidden transition-all ease-in-out duration-300";
        account_menu.style.opacity = "0";
        account_menu.style.display = "none";
        account_menu.style.transform = "translateX(1rem)";

        subscribeMenuState((newState) => {
          if (newState) {
            account_menu.style.display = "block";
            setTimeout(() => {
              account_menu.style.opacity = "100";
              account_menu.style.transform = "translateX(0)";
            }, 5);
          } else {
            account_menu.style.opacity = "0";
            account_menu.style.transform = "translateX(1rem)";
            setTimeout(() => {
              account_menu.style.display = "none";
            }, 300);
          }
        });

        account_node.addEventListener("click", (e) => {
          e.stopPropagation();
          setMenuState(!getMenuState());
        });

        window.addEventListener("click", (e) => {
          if (
            getMenuState() &&
            e.target !== account_node &&
            e.target !== account_menu &&
            !account_menu.contains(e.target as Node)
          ) {
            setMenuState(false);
          }
        });

        account_node.appendChild(account_menu);

        const change_avatar = document.createElement("div");
        change_avatar.className =
          "h-8 w-auto px-2 flex items-center space-x-2 hover:bg-white/10 transition ease-in duration-300 cursor-pointer rounded-lg";
        change_avatar.innerHTML =
          "<img src='./icons/person_24dp.png' class='h-4 w-4' /><span>Change Avatar</span>";

        account_menu.appendChild(change_avatar);

        change_avatar.addEventListener("click", () =>
          open("http://animenetwork.org/avatar"),
        );

        const logout = document.createElement("div");
        logout.className =
          "h-8 w-auto px-2 flex items-center space-x-2 hover:bg-white/10 transition ease-in duration-300 cursor-pointer rounded-lg";
        logout.innerHTML =
          "<img src='./icons/logout_24dp.png' class='h-4 w-4' /><span>Logout</span>";

        account_menu.appendChild(logout);

        logout.addEventListener("click", () => {
          if (!localStorage.getItem("token")) return;
          localStorage.removeItem("token");
          build_account();
        });
      } else {
        const login_node = document.createElement("div");
        login_node.className = "h-full w-full flex items-center justify-center";
        login_node.innerHTML =
          "<img src='./icons/person_24dp.png' class='h-4 w-4' />";

        account_node.appendChild(login_node);

        login_node.addEventListener("click", () =>
          login_callback(build_account),
        );
      }
    };
    build_account();
  }

  function current_handler(url: string, image: string) {
    setCurrent({ url: url, image: image });
  }

  return {
    render: render,
    current_handler: current_handler,
  };
}

export default top_constructor;
