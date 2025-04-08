import createState from "./createstate";
import { SubscribeFunction } from "./types";
import profile_panel from "./profile_module";
import searchModule from "./search_module";

function top_constructor(
  top: HTMLElement,
  login_callback: (fn: () => void) => void,
  watch_callback: (redirect: string) => void,
  userSignal: SubscribeFunction<object | null>,
  userState,
  settings: () => void,
) {
  const history_Array = [];

  function render() {
    const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
    const top_node = document.createElement("div");
    top_node.className =
      "relative h-full w-full flex items-center justify-center px-2 space-x-2";
    top_node.innerHTML =
      "<div class='absolute left-4 text-[#d8d5d0] text-xl'>Anime Studio</div>";

    top.appendChild(top_node);

    const search_node = document.createElement("div");
    search_node.className =
      "absolute right-12 h-8 w-8 flex items-center justify-center cursor-pointer";
    search_node.innerHTML =
      "<img src='./icons/search_24dp.svg' class='h-6 w-6' />";

    top_node.appendChild(search_node);

    searchModule(document.body, search_node, watch_callback);

    const account_node = document.createElement("div");
    account_node.className =
      "absolute right-4 w-8 h-8 rounded-full bg-neutral-600 flex items-center";

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
        "absolute z-40 top-10 right-0 h-fit w-72 p-4 space-y-2 bg-[rgb(6,6,6)] border border-[hsla(0,0%,100%,.15)] shadow-[4px_8px_16px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden transition-all ease-in-out duration-100";
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
        "w-full h-32 flex flex-col space-y-2 items-center justify-center";

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
        "w-full text-center font-semibold truncate space-x-1";
      if (user) {
        user_nickname.innerHTML = `<div class="bg-gradient-to-r from-[rgb(80,130,238)] via-[rgb(192,106,148)] to-[rgb(211,102,121)] inline-block text-transparent bg-clip-text">Hello ${user.username}</div>`;
      } else {
        user_nickname.innerHTML = "<span class='text-white'>Welcome";
      }

      user_region.appendChild(user_nickname);

      const profile_node = document.createElement("div");
      profile_node.className =
        "w-auto px-2 py-2 flex items-center space-x-2 bg-[rgb(18,18,18)] text-white cursor-pointer rounded-md outline outline-[hsla(0,0%,100%,0.15)] hover:outline-2 hover:outline-[rgb(49,139,255)] transition-[outline] duration-150";
      profile_node.innerHTML =
        "<img src='./icons/dashboard_24dp.svg' fill='black' class='h-4 w-4 rounded-full object-cover'><span class='text-sm'>Dashboard</span>";

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
        "w-auto px-2 py-2 flex items-center space-x-2 bg-[rgb(18,18,18)] text-white cursor-pointer rounded-md outline outline-[hsla(0,0%,100%,0.15)] hover:outline-2 hover:outline-[rgb(49,139,255)] transition-[outline] duration-150";
      settings_node.innerHTML =
        "<img src='./icons/settings_24dp.svg' fill='black' class='h-4 w-4 rounded-full object-cover'><span class='text-sm'>Settings</span>";

      account_menu.appendChild(settings_node);

      settings_node.addEventListener("click", () => settings());

      account_menu.insertAdjacentHTML(
        "beforeend",
        "<div class='my-2 h-0.25 w-full bg-[#333333]'></div>",
      );

      const sign = document.createElement("div");
      sign.className =
        "w-auto px-2 py-2 flex items-center space-x-2 bg-[rgb(18,18,18)] text-white cursor-pointer rounded-md outline outline-[hsla(0,0%,100%,0.15)] hover:outline-2 hover:outline-[rgb(49,139,255)] transition-[outline] duration-150";
      sign.innerHTML = `<img src='./icons/${!user ? "log_24dp.png" : "logout_24dp.png"}' fill='black' class='h-4 w-4 rounded-full object-cover'><span class='text-sm'>${!user ? "Sign in" : "Sign out"}</span>`;

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
