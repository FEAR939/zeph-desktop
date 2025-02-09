import { AvatarChanger } from "./change_avatar";
import Devider from "./devider";

export function AccountSettings(
  parent: HTMLElement,
  close,
  userState,
  auth_page,
) {
  parent.innerHTML = "";

  Devider(parent, "account");

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

  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "relative h-16 w-16";

  const avatarImage = document.createElement("img");
  avatarImage.className = "h-full w-full rounded-full";
  avatarImage.src = `${localStorage.getItem("api_url") + userState.get().avatar_url}`;

  userState.subscribe((newUser) => {
    avatarImage.src = `${localStorage.getItem("api_url") + newUser.avatar_url}`;
  });

  avatarWrapper.appendChild(avatarImage);

  const avatarChange = document.createElement("div");
  avatarChange.className =
    "absolute -right-1 -bottom-1 h-6 w-6 bg-neutral-900 hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors";
  avatarChange.innerHTML =
    "<img src='./icons/edit_24dp.svg' class='h4 w-4 object-cover cursor-pointer' />";

  avatarWrapper.appendChild(avatarChange);

  avatarChange.addEventListener("click", () =>
    AvatarChanger(parent, userState),
  );

  parent.appendChild(avatarWrapper);
}
