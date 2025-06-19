import { AccountSettings } from "./components/settings_account";

const settings = [
  {
    icon: "./icons/person_24dp.png",
    label: "Account",
    fn: AccountSettings,
  },
];

export function Settings(userState, auth_page) {
  const build = () => {
    const settingsWrapper = document.createElement("div");
    settingsWrapper.className =
      "absolute z-40 inset-0 h-full w-full flex justify-center bg-neutral-950/60 backdrop-blur-xl";

    const close = () => settingsWrapper.remove();

    const settingsPanel = document.createElement("div");
    settingsPanel.className =
      "min-h-[calc(100%-1rem)] h-full w-[64rem] max-w-full mt-4 overflow-hidden border-box";

    const closePanel = document.createElement("img");
    closePanel.className = "m-4 h-8 w-8 cursor-pointer";
    closePanel.src = "./icons/keyboard_backspace_24dp.png";

    settingsPanel.appendChild(closePanel);

    closePanel.addEventListener("click", () => {
      settingsWrapper.remove();
    });

    const settings_main = document.createElement("div");
    settings_main.className = "h-full w-full flex";

    settingsPanel.appendChild(settings_main);

    const main_nav = document.createElement("div");
    main_nav.className = "h-full w-64 p-2 border-r border-neutral-700";

    settings_main.appendChild(main_nav);

    const main_container = document.createElement("div");
    main_container.className = "h-full w-full p-2 space-y-4";

    settings.map((setting) => {
      const navSetting = document.createElement("div");
      navSetting.className =
        "flex space-x-2 items-center px-2 py-1 cursor-pointer text-sm hover:bg-neutral-950/60 hover:backdrop-blur-xl hover:outline hover:outline-neutral-800 rounded-lg";
      navSetting.innerHTML = `<img src="${setting.icon}" alt="${setting.label}" class="h-4 w-4"/><div>${setting.label}</div>`;

      main_nav.appendChild(navSetting);

      main_nav.addEventListener("click", () =>
        setting.fn(main_container, close, userState, auth_page),
      );
    });

    settings_main.appendChild(main_container);

    settingsWrapper.appendChild(settingsPanel);

    document.body.appendChild(settingsWrapper);
  };

  return build;
}
