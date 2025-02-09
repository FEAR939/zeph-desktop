import { AccountSettings } from "./components/settings_account";

const settings = [
  {
    label: "Account",
    fn: AccountSettings,
  },
];

export function Settings(userState, auth_page) {
  const build = () => {
    const settingsWrapper = document.createElement("div");
    settingsWrapper.className =
      "absolute z-40 inset-0 h-full w-full flex justify-center bg-black/25";

    const close = () => settingsWrapper.remove();

    const settingsPanel = document.createElement("div");
    settingsPanel.className =
      "h-[calc(100% - 1rem)] w-[64rem] max-w-1/2 mt-4 bg-neutral-950 rounded-t-xl flex flex-col";

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
    main_nav.className =
      "h-full w-64 p-2 border-r border-t border-neutral-800 rounded-tr-xl";

    settings_main.appendChild(main_nav);

    const main_container = document.createElement("div");
    main_container.className = "h-full w-full p-2";

    settings.map((setting) => {
      const navSetting = document.createElement("div");
      navSetting.className =
        "px-2 py-1 rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors text-sm";
      navSetting.textContent = setting.label;

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
