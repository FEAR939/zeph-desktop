import { fetch } from "@tauri-apps/plugin-http";
import createState from "./createstate";
import { Search } from "./components/search";
import { SubscribeFunction } from "./types";
import { Settings } from "./settings";
import Devider from "./components/devider";
import profile_panel from "./profile_module";

function top_constructor(
  top: HTMLElement,
  login_callback: (fn: () => void) => void,
  watch_callback: (redirect: string) => void,
  userSignal: SubscribeFunction<object | null>,
  userState,
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

    const account_node = document.createElement("div");
    account_node.className =
      "absolute right-8 w-8 h-8 rounded-full bg-neutral-600 flex items-center";

    top_node.appendChild(account_node);

    const build_account = async (user?: object) => {
      account_node.innerHTML = "";

      const asyncImage = new Image();

      if (user) {
        asyncImage.src = `${localStorage.getItem("api_url") + user.avatar_url}`;
      } else {
        asyncImage.src = "./icons/person_24dp.png";
        asyncImage.style.transform = "scale(0.75)";
      }

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

      if (user) {
        avatarImage.src = `${localStorage.getItem("api_url") + user.avatar_url}`;
      } else {
        avatarImage.src = "./icons/person_24dp.png";
        avatarImage.style.transform = "scale(0.75)";
      }

      avatarImage.alt = "avatar";
      avatarImage.className = "h-16 w-16 rounded-full object-cover";

      user_region.appendChild(avatarImage);

      const user_nickname = document.createElement("div");
      user_nickname.className =
        "w-full text-center font-bold truncate space-x-1";
      if (user) {
        user_nickname.innerHTML = `<span class="text-neutral-600">Welcome,</span><div class="bg-gradient-to-r from-purple-200 via-purple-300 to-purple-600 inline-block text-transparent bg-clip-text">${user.username}</div>`;
      } else {
        user_nickname.innerHTML = "<span class='text-neutral-600'>Welcome";
      }

      user_region.appendChild(user_nickname);

      const profile_node = document.createElement("div");
      profile_node.className =
        "w-auto px-4 py-2 flex items-center space-x-2 hover:bg-white/10 transition-colors cursor-pointer rounded";
      profile_node.innerHTML =
        "<img src='./icons/person_24dp.png' class='h-4 w-4' /><span>Profile</span>";

      if (!user) {
        profile_node.classList.add("text-neutral-700");
      }

      profile_node.addEventListener("click", () => {
        if (!user) return;
        profile_panel(userState);
      });

      account_menu.appendChild(profile_node);

      const settings_node = document.createElement("div");
      settings_node.className =
        "w-auto px-4 py-2 flex items-center space-x-2 hover:bg-white/10 transition-colors cursor-pointer rounded";
      settings_node.innerHTML =
        "<img src='./icons/settings_24dp.svg' class='h-4 w-4' /><span>Settings</span>";

      account_menu.appendChild(settings_node);

      settings_node.addEventListener("click", () => settings());

      const sign = document.createElement("div");
      sign.className =
        "w-auto px-4 py-2 flex items-center space-x-2 hover:bg-white/10 transition-colors cursor-pointer rounded";
      sign.innerHTML = `<img src='./icons/logout_24dp.png' class='h-4 w-4' /><span>${!user ? "Sign in" : "Sign out"}</span>`;

      account_menu.appendChild(sign);

      sign.addEventListener("click", () => {
        localStorage.removeItem("token");
        if (user) {
          build_account();
        } else {
          login_callback(build_account);
        }
      });
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
