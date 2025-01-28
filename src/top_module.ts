import { fetch } from "@tauri-apps/plugin-http";
import { open } from "@tauri-apps/plugin-shell";
import createState from "./createstate";
import { Search } from "./components/search";

function top_constructor(
  top: HTMLElement,
  login_callback: (fn: () => void) => void,
  watch_callback: (redirect: string) => void,
) {
  const history_Array = [];

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

    Search(top_node);

    // const current_node = document.createElement("div");
    // current_node.className =
    //   "h-8 w-16 rounded-full bg-neutral-800 cursor-pointer overflow-hidden hidden";

    // top_node.appendChild(current_node);

    // current_node.addEventListener("click", () => {
    //   watch_callback(getCurrent().url);
    // });

    // const current_image = document.createElement("img");
    // current_image.className = "h-full w-full object-cover";

    // current_node.appendChild(current_image);

    // subscribeCurrent((newCurrent) => {
    //   current_image.src = `https://aniworld.to${newCurrent.image}`;
    //   current_node.classList.remove("hidden");
    // });

    const history_wrapper = document.createElement("div");
    history_wrapper.className =
      "absolute right-12 h-8 w-8 rounded-full bg-neutral-800";

    const history_node = document.createElement("div");
    history_node.className =
      "h-full w-full flex items-center justify-center cursor-pointer";
    history_node.innerHTML =
      "<img src='./icons/history_24dp.svg' class='h-4 w-4' />";

    history_wrapper.appendChild(history_node);

    const [getExpand, setExpand, subscribeExpand] = createState(false);

    const history_list = document.createElement("div");
    history_list.className =
      "absolute h-fit max-h-96 w-48 p-4 top-10 right-0 bg-neutral-800 rounded-[18px] overflow-y-scroll";

    history_wrapper.appendChild(history_list);

    subscribeExpand((newExpand) => {
      if (newExpand) {
        history_list.style.display = "block";
        if (history_Array.length == 0) {
          history_list.innerHTML =
            "<div class='w-full mb-2 px-2 text-neutral-200 border-b border-neutral-200'>History</div><div class='px-2'>No History</div>";
        } else {
          history_list.innerHTML =
            "<div class='w-full mb-2 px-2 text-neutral-200 border-b border-neutral-200'>History</div>";
          history_Array.toReversed().map((item) => {
            const item_node = document.createElement("div");
            item_node.className =
              "h-8 w-auto px-2 flex items-center hover:bg-neutral-700 rounded-lg cursor-pointer transition duration-300";
            item_node.innerHTML = `<span class='truncate'>${item.title}</span>`;

            history_list.appendChild(item_node);

            item_node.addEventListener("click", () => {
              watch_callback(item.url);
            });
          });
        }
      } else {
        history_list.style.display = "none";
      }
    });

    setExpand(false);

    top_node.appendChild(history_wrapper);

    history_node.addEventListener("click", () => setExpand(!getExpand()));

    window.addEventListener("click", (e) => {
      if (
        getExpand() &&
        e.target !== account_node &&
        e.target !== history_list &&
        !history_wrapper.contains(e.target as Node)
      ) {
        setExpand(false);
      }
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
          "absolute z-40 top-10 right-0 h-fit w-64 p-4 rounded-[18px] bg-neutral-800 overflow-hidden transition-all ease-in-out duration-300";
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

  function current_handler(url: string, title: string) {
    history_Array.push({ url: url, title: title });
  }

  return {
    render: render,
    current_handler: current_handler,
  };
}

export default top_constructor;
