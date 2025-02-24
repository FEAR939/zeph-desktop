import { fetch } from "@tauri-apps/plugin-http";
import createState from "./createstate";
import { Search } from "./components/search";
import { SubscribeFunction } from "./types";
import { Settings } from "./settings";
import Devider from "./components/devider";

function top_constructor(
  top: HTMLElement,
  login_callback: (fn: () => void) => void,
  watch_callback: (redirect: string) => void,
  userSignal: SubscribeFunction<object | null>,
  settings: () => void,
  nav_show,
) {
  const history_Array = [];

  function render() {
    const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
    const top_node = document.createElement("div");
    top_node.className =
      "relative h-full w-full flex items-center justify-center px-4 space-x-2";

    top.appendChild(top_node);

    const show = document.createElement("div");
    show.className =
      "absolute left-6 h-10 w-10 cursor-pointer hover:bg-neutral-800 flex items-center justify-center rounded-md transition-colors";
    show.innerHTML = "<img src='./icons/menu_24dp.svg' class='h-6 w-6' />";

    top_node.appendChild(show);

    show.addEventListener("click", () => nav_show.setShow(!nav_show.getShow()));

    Search(top_node, watch_callback);

    if (!isMobileDevice) {
      const history_wrapper = document.createElement("div");
      history_wrapper.className = "absolute right-30 h-10 w-10";

      const history_node = document.createElement("div");
      history_node.className =
        "h-full w-full cursor-pointer hover:bg-neutral-800 flex items-center justify-center rounded-md transition-colors";
      history_node.innerHTML =
        "<img src='./icons/history_24dp.svg' class='h-6 w-6' />";

      history_wrapper.appendChild(history_node);

      const [getExpand, setExpand, subscribeExpand] = createState(false);

      const history_list = document.createElement("div");
      history_list.className =
        "absolute h-fit w-64 p-4 top-12 right-0 bg-neutral-950 border border-neutral-800 rounded-md";

      Devider(history_list, "history");

      const history_list_inner = document.createElement("div");
      history_list_inner.className = "h-fit max-h-96 w-full overflow-y-scroll";

      history_list.appendChild(history_list_inner);

      history_wrapper.appendChild(history_list);

      subscribeExpand((newExpand) => {
        if (newExpand) {
          history_list.style.display = "block";
          if (history_Array.length == 0) {
            history_list_inner.innerHTML = "<div class='px-2'>No History</div>";
          } else {
            history_list_inner.innerHTML = "";
            history_Array.toReversed().map((item) => {
              const item_node = document.createElement("div");
              item_node.className =
                "h-12 w-auto flex items-center cursor-pointer space-x-2";
              item_node.innerHTML = `<img src="https://aniworld.to${item.image}" class="h-full aspect-[1/1.3] rounded"/><span class='truncate'>${item.title}</span>`;

              history_list_inner.appendChild(item_node);

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

      const settings_node = document.createElement("div");
      settings_node.className =
        "absolute right-18 h-10 w-10 cursor-pointer hover:bg-neutral-800 flex items-center justify-center rounded-md transition-colors";
      settings_node.innerHTML =
        "<img src='./icons/settings_24dp.svg' class='h-6 w-6 object-cover' />";

      top_node.appendChild(settings_node);

      settings_node.addEventListener("click", () => settings());
    }

    const account_node = document.createElement("div");
    account_node.className =
      "absolute right-8 w-8 h-8 rounded-full bg-neutral-600 flex items-center";

    top_node.appendChild(account_node);

    const build_account = async (user?: object) => {
      account_node.innerHTML = "";

      if (user) {
        const asyncImage = new Image();
        asyncImage.src = `${localStorage.getItem("api_url") + user.avatar_url}`;
        asyncImage.alt = "avatar";
        asyncImage.className =
          "h-full w-full rounded-full object-cover cursor-pointer";
        account_node.appendChild(asyncImage);

        const [getMenuState, setMenuState, subscribeMenuState] =
          createState(false);

        const account_menu = document.createElement("div");
        account_menu.className =
          "absolute z-40 top-10 right-0 h-fit w-64 p-2 bg-neutral-950 border border-neutral-800 rounded-md overflow-hidden transition-all ease-in-out duration-100";
        account_menu.style.opacity = "0";
        account_menu.style.display = "none";
        account_menu.style.transform = "scale(0.75)";

        subscribeMenuState((newState) => {
          if (newState) {
            account_menu.style.display = "block";
            setTimeout(() => {
              account_menu.style.opacity = "100";
              account_menu.style.transform = "scale(1)";
            }, 5);
          } else {
            account_menu.style.opacity = "0";
            account_menu.style.transform = "scale(0.75)";
            setTimeout(() => {
              account_menu.style.display = "none";
            }, 300);
          }
        });

        asyncImage.addEventListener("click", (e) => {
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

        const user_region = document.createElement("div");
        user_region.className =
          "w-full h-32 flex flex-col space-y-2 items-center justify-center border-b border-neutral-600 mb-2";

        account_menu.appendChild(user_region);

        const avatarImage = new Image();
        avatarImage.src = `${localStorage.getItem("api_url") + user.avatar_url}`;
        avatarImage.alt = "avatar";
        avatarImage.className = "h-16 w-16 rounded-full object-cover";

        user_region.appendChild(avatarImage);

        const user_nickname = document.createElement("div");
        user_nickname.className = "w-full text-center font-bold truncate";
        user_nickname.innerHTML = `<span class="text-neutral-600">Welcome,</span> ${user.username}`;

        user_region.appendChild(user_nickname);

        const logout = document.createElement("div");
        logout.className =
          "w-auto px-4 py-2 flex items-center space-x-2 hover:bg-white/10 transition-colors cursor-pointer rounded";
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
        login_node.className =
          "h-full w-full flex items-center justify-center cursor-pointer";
        login_node.innerHTML =
          "<img src='./icons/person_24dp.png' class='h-4 w-4' />";

        account_node.appendChild(login_node);

        login_node.addEventListener("click", () =>
          login_callback(build_account),
        );
      }
    };
    build_account();

    userSignal((newUser) => build_account(newUser));
  }

  function current_handler(url: string, image: string, title: string) {
    history_Array.push({ url: url, image: image, title: title });
  }

  return {
    render: render,
    current_handler: current_handler,
  };
}

export default top_constructor;
