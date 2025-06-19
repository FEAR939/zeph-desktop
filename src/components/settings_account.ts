import { ImageChanger } from "./image_changer";

export function AccountSettings(
  parent: HTMLElement,
  close,
  userState,
  auth_page,
) {
  parent.innerHTML = "";

  if (!localStorage.getItem("token")) {
    const signinBtn = document.createElement("div");
    signinBtn.className =
      "w-fit px-2 py-1 rounded-lg bg-neutral-800 cursor-pointer";
    signinBtn.textContent = "Sign in";

    parent.appendChild(signinBtn);

    signinBtn.addEventListener("click", () => {
      close();
      auth_page();
    });

    return;
  }

  const profileWrapper = document.createElement("div");
  profileWrapper.className = "w-full max-w-md h-fit";

  parent.appendChild(profileWrapper);

  const bannerWrapper = document.createElement("div");
  bannerWrapper.className = "relative w-full h-fit";

  const bannerImage = document.createElement("img");
  bannerImage.className = "w-full aspect-[2.5/1] object-cover rounded";
  bannerImage.src = `${localStorage.getItem("api_url") + userState.get().banner_url}`;

  userState.subscribe((newUser) => {
    bannerImage.src = `${localStorage.getItem("api_url") + newUser.banner_url}`;
  });

  bannerWrapper.appendChild(bannerImage);

  const bannerChange = document.createElement("div");
  bannerChange.className =
    "absolute right-2 bottom-2 h-6 w-6 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors";
  bannerChange.innerHTML =
    "<img src='./icons/edit_24dp.svg' class='h4 w-4 object-cover cursor-pointer' />";

  bannerChange.addEventListener("click", () => {
    ImageChanger(parent, userState, "banner");
  });

  bannerWrapper.appendChild(bannerChange);

  profileWrapper.appendChild(bannerWrapper);

  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "relative left-4 bottom-10 h-16 w-16";

  const avatarImage = document.createElement("img");
  avatarImage.className = "h-full w-full rounded-full";
  avatarImage.src = `${localStorage.getItem("api_url") + userState.get().avatar_url}`;

  userState.subscribe((newUser) => {
    avatarImage.src = `${localStorage.getItem("api_url") + newUser.avatar_url}`;
  });

  avatarWrapper.appendChild(avatarImage);

  const avatarChange = document.createElement("div");
  avatarChange.className =
    "absolute -right-1 -bottom-1 h-6 w-6 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors";
  avatarChange.innerHTML =
    "<img src='./icons/edit_24dp.svg' class='h4 w-4 object-cover cursor-pointer' />";

  avatarWrapper.appendChild(avatarChange);

  avatarChange.addEventListener("click", () =>
    ImageChanger(parent, userState, "avatar"),
  );

  profileWrapper.appendChild(avatarWrapper);
}
