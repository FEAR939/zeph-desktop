import { AvatarChanger } from "./change_avatar";

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

  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "relative h-16 w-16";

  const avatarImage = document.createElement("img");
  avatarImage.className = "h-full w-full rounded-full";
  avatarImage.src = `http://animenetwork.org${userState.get().avatar_url}`;

  userState.subscribe((newUser) => {
    avatarImage.src = `http://animenetwork.org${newUser.avatar_url}`;
  });

  avatarWrapper.appendChild(avatarImage);

  const avatarChange = document.createElement("div");
  avatarChange.className =
    "absolute right-0 bottom-0 h-6 w-6 bg-neutral-700 rounded-full flex items-center justify-center";
  avatarChange.innerHTML =
    "<img src='./icons/edit_24dp.svg' class='h4 w-4 object-cover cursor-pointer' />";

  avatarWrapper.appendChild(avatarChange);

  avatarChange.addEventListener("click", () =>
    AvatarChanger(parent, userState),
  );

  parent.appendChild(avatarWrapper);
}
