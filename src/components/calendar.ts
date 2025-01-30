import { fetch } from "@tauri-apps/plugin-http";
import createState from "../createstate";

async function get_calendar() {
  try {
    const response = (await fetch("https://aniworld.to/animekalender")).text();
    const html = new DOMParser().parseFromString(await response, "text/html");

    const sections = html.querySelectorAll(".calendarList");

    const schedule = [];
    sections.forEach((section) => {
      const dateElem = section.querySelector("h3")?.textContent || "";

      const commaIdx = dateElem.indexOf(",");
      const day = dateElem.substring(0, commaIdx);

      const date =
        dateElem
          ?.replace("Montag, ", "")
          .replace("Dienstag, ", "")
          .replace("Mittwoch, ", "")
          .replace("Donnerstag, ", "")
          .replace("Freitag, ", "")
          .replace("Samstag, ", "")
          .replace("Sonntag, ", "")
          .substring(0, 10) || "";

      const entry = {
        day: day,
        date: date,
        items: [],
      };

      const anime = section.querySelectorAll("a");
      anime.forEach((anim) => {
        const title = anim.querySelector(".seriesTitle")?.textContent?.trim();
        const image = anim.querySelector("img")?.getAttribute("data-src");
        const ep = anim
          .querySelector("small:first-of-type")
          ?.textContent?.trim();
        const time = anim
          .querySelector("small:last-of-type")
          ?.textContent?.trim()
          .substring(2, 7);

        const item = {
          title: title || "",
          image: image || "",
          ep: ep || "",
          time: time || "",
        };

        entry.items.push(item);
      });

      schedule.push(entry);
    });

    return schedule;
  } catch {
    console.log("couln't get calendar");
    return [];
  }
}

export async function Calendar(content: HTMLElement) {
  const calendar_wrapper = document.createElement("div");
  calendar_wrapper.className =
    "relative flex flex-col m-8 pb-4 h-[36rem] bg-neutral-900 rounded-[18px] overflow-hidden";

  content.appendChild(calendar_wrapper);

  let schedule = [];

  if (!localStorage.getItem("calendar")) {
    schedule = await get_calendar();
    localStorage.setItem(
      "calendar",
      JSON.stringify({ calendar: schedule, timestamp: Date.now() }),
    );
  } else if (
    (Date.now() -
      JSON.parse(localStorage.getItem("calendar") || "").timestamp) /
      1000 >
    3600
  ) {
    schedule = await get_calendar();
    localStorage.setItem(
      "calendar",
      JSON.stringify({ calendar: schedule, timestamp: Date.now() }),
    );
  } else {
    schedule =
      JSON.parse(localStorage.getItem("calendar") || "[]").calendar || [];
  }

  const tool_row = document.createElement("div");
  tool_row.className =
    "relative h-32 w-full px-4 space-x-2 space-y-2 flex flex-col justify-center";

  const tool_month = document.createElement("div");
  tool_month.className = "font-medium";
  tool_month.textContent = new Date().toLocaleString("default", {
    month: "long",
  });

  tool_row.appendChild(tool_month);

  const tool_date = document.createElement("div");
  tool_date.textContent = `${schedule[0].date} - ${schedule[schedule.length - 1].date}`;

  tool_row.appendChild(tool_date);

  const tool_search_wrapper = document.createElement("div");
  tool_search_wrapper.className =
    "absolute right-22 top-4 h-8 w-48 px-2 bg-neutral-800 rounded-full flex space-x-2 items-center";
  tool_search_wrapper.innerHTML =
    "<img src='./icons/search_24dp.svg' class='h-4 w-4' />";

  const search_input = document.createElement("input");
  search_input.className = "text-sm w-full";
  search_input.placeholder = "Search";

  tool_search_wrapper.appendChild(search_input);

  tool_row.appendChild(tool_search_wrapper);

  const prev = document.createElement("div");
  prev.className =
    "absolute right-12 top-4 h-8 w-8 bg-neutral-800 rounded-full flex items-center justify-center cursor-pointer";
  prev.innerHTML =
    "<img src='./icons/chevron_left_24dp.png' class='h-4 w-4' />";

  tool_row.appendChild(prev);

  const next = document.createElement("div");
  next.className =
    "absolute right-4 top-4 h-8 w-8 bg-neutral-800 rounded-full flex items-center justify-center cursor-pointer";
  next.innerHTML =
    "<img src='./icons/chevron_right_24dp.png' class='h-4 w-4' />";

  tool_row.appendChild(next);

  prev.addEventListener("click", () => {
    top_days.scrollLeft = 0;
    main_row_inner.scrollLeft = 0;
  });

  next.addEventListener("click", () => {
    top_days.scrollLeft = top_days.scrollWidth;
    main_row_inner.scrollLeft = main_row_inner.scrollWidth;
  });

  calendar_wrapper.appendChild(tool_row);

  const top_row = document.createElement("div");
  top_row.className = "h-16 w-full flex border-b border-neutral-600";
  top_row.innerHTML =
    "<div class='h-full w-24 flex items-center justify-center border-r border-neutral-600 shrink-0'>CET</div>";

  calendar_wrapper.appendChild(top_row);

  const top_days = document.createElement("div");
  top_days.className = "h-full w-full flex overflow-hidden";

  top_row.appendChild(top_days);

  const main_row = document.createElement("div");
  main_row.className = "h-full w-full overflow-y-scroll";

  calendar_wrapper.appendChild(main_row);

  const main_row_outer = document.createElement("div");
  main_row_outer.className = "relative h-fit w-full flex overflow-hidden";

  main_row.appendChild(main_row_outer);

  const time_column = document.createElement("div");
  time_column.className =
    "relative h-fit w-24 border-r border-neutral-600 shrink-0";

  for (let i = 0; i <= 23; i++) {
    const time_node = document.createElement("div");
    time_node.className = "h-16 w-full flex items-end justify-center";
    time_node.textContent = `${i.toString().length == 1 ? "0" + i : i}:00`;

    time_column.appendChild(time_node);

    const main_time_row = document.createElement("div");
    main_time_row.className = "absolute left-24 h-16 w-full";
    if (i !== 23) {
      main_time_row.classList.add("border-b", "border-neutral-600");
    }
    main_time_row.style.top = `${i * 4}rem`;

    main_row_outer.appendChild(main_time_row);
  }

  const current_time = document.createElement("div");
  current_time.className =
    "absolute left-0 right-0 h-6 w-fit mx-auto px-2 bg-blue-400 rounded-full flex items-center justify-center text-sm";

  time_column.appendChild(current_time);

  const current_time_bar = document.createElement("div");
  current_time_bar.className =
    "absolute left-24 h-0.5 w-full bg-blue-400 flex items-center z-10";

  current_time_bar.innerHTML =
    "<div class='absolute -left-2 h-4 w-4 bg-blue-400 rounded-full'></div>";

  main_row_outer.appendChild(current_time_bar);

  main_row_outer.appendChild(time_column);

  function moveCurrentTime() {
    const currentDate = new Date();
    const currentHours = `${currentDate.getHours().toString().length == 1 ? "0" + currentDate.getHours() : currentDate.getHours()}`;
    const currentMinutes = `${currentDate.getMinutes().toString().length == 1 ? "0" + currentDate.getMinutes() : currentDate.getMinutes()}`;

    current_time.textContent = `${currentHours}:${currentMinutes}`;
    current_time.style.top = `${currentDate.getHours() * 4 + (4 / 60) * currentDate.getMinutes() - 0.75}rem`;

    current_time_bar.style.top = `${currentDate.getHours() * 4 + (4 / 60) * currentDate.getMinutes()}rem`;
    setTimeout(() => {
      moveCurrentTime();
    }, 30000);
  }

  moveCurrentTime();

  const [getShow, setShow, subscribeShow] = createState(false);

  const modal = document.createElement("div");
  modal.className =
    "absolute z-30 inset-0 m-auto h-[32rem] w-96 p-4 bg-neutral-800 rounded-lg flex flex-col";

  calendar_wrapper.appendChild(modal);

  subscribeShow((newShow) => {
    if (newShow) {
      modal.style.display = "flex";
    } else {
      modal.style.display = "none";
    }
  });

  setShow(false);

  const modal_close = document.createElement("img");
  modal_close.className = "h-8 w-8 cursor-pointer";
  modal_close.src = "./icons/keyboard_backspace_24dp.png";

  modal.appendChild(modal_close);

  modal_close.addEventListener("click", () => setShow(false));

  const modal_list = document.createElement("div");
  modal_list.className = "h-full w-full overflow-y-scroll";

  modal.appendChild(modal_list);

  const main_row_inner = document.createElement("div");
  main_row_inner.className = "h-auto w-full flex flex overflow-hidden";

  main_row_outer.appendChild(main_row_inner);

  main_row_inner.addEventListener("scroll", () => {
    top_days.scrollLeft = main_row_inner.scrollLeft;
  });

  if (schedule.length == 0) return;

  schedule.map((day, i) => {
    const time_groups = [];
    for (let i = 0; i < 24; i++) {
      time_groups.push({ items: [] });
    }

    for (let item of day.items) {
      const idx = parseInt(item.time.substring(0, 2));

      time_groups[idx].items.push(item);
    }

    const day_node = document.createElement("div");
    day_node.className =
      "h-full w-[calc(100%/7)] shrink-0 flex items-center justify-center";
    day_node.innerHTML = `${day.day} <span class=" ml-2 font-medium">${day.date.substring(0, 2)}</span>`;

    top_days.appendChild(day_node);

    const main_day_node = document.createElement("div");
    main_day_node.className = "relative h-auto w-[calc(100%/7)] shrink-0";

    main_row_inner.appendChild(main_day_node);

    if (i !== schedule.length - 1) {
      day_node.classList.add("border-r", "border-neutral-600");
      main_day_node.classList.add("border-r", "border-neutral-600");
    }

    for (let i = 0; i < time_groups.length; i++) {
      if (time_groups[i].items.length == 0) continue;
      const group_node = document.createElement("div");
      group_node.className = `absolute z-20 h-16 w-full flex items-center justify-center`;
      group_node.style.top = `${i * 4}rem`;

      main_day_node.appendChild(group_node);

      search_input.addEventListener("keyup", () => {
        time_groups[i].items.map((item) => {
          if (
            item.title.toLowerCase().includes(search_input.value.toLowerCase())
          ) {
            group_node.style.opacity = "1";
          } else {
            group_node.style.opacity = "0.1";
          }
        });
      });

      const item_node = document.createElement("div");
      item_node.className =
        "relative h-[calc(100%-1rem)] w-[calc(100%-1rem)] bg-neutral-800 rounded-lg cursor-pointer";

      group_node.appendChild(item_node);

      item_node.addEventListener("click", () => {
        modal_list.innerHTML = "";
        time_groups[i].items.map((item) => {
          const modal_node = document.createElement("div");
          modal_node.className =
            "h-32 w-full px-4 flex items-center space-x-4 rounded-lg hover:bg-neutral-700 transition-colors";

          modal_list.appendChild(modal_node);

          const modal_image = document.createElement("div");
          modal_image.className =
            "w-20 shrink-0 aspect-[1/1.3] overflow-hidden rounded-lg bg-neutral-700";

          modal_node.appendChild(modal_image);

          const modal_info = document.createElement("div");
          modal_info.className =
            "h-full w-full flex flex-col justify-center space-y-1 overflow-hidden";

          modal_node.appendChild(modal_info);

          const modal_title = document.createElement("div");
          modal_title.className = "flex font-medium group-hover:text-white";
          modal_title.innerHTML = `<span class='truncate'>${item.title}</span>`;

          modal_info.appendChild(modal_title);

          const modal_description = document.createElement("div");
          modal_description.className = "w-full text-sm text-neutral-400";
          modal_description.textContent = item.time;

          modal_info.appendChild(modal_description);

          const asyncImage = new Image();
          asyncImage.src = `https://aniworld.to${item.image}`;
          asyncImage.className = "w-full object-cover";

          asyncImage.addEventListener("load", () => {
            modal_image.appendChild(asyncImage);
          });
        });
        setShow(true);
      });

      const item_count = document.createElement("div");
      item_count.className =
        "absolute z-10 right-1 bottom-1 px-2 text-sm bg-black/30 rounded-full text-sm";
      item_count.textContent = `${time_groups[i].items.length}+`;

      item_node.appendChild(item_count);

      for (let j = 0; j < Math.min(time_groups[i].items.length, 1); j++) {
        const preview_image = document.createElement("img");
        preview_image.className =
          "absolute inset-0 h-full w-full object-cover rounded-lg blur-xs brightness-75";

        preview_image.src = `https://aniworld.to${time_groups[i].items[j]?.image}`;

        preview_image.addEventListener("load", () => {
          item_node.appendChild(preview_image);
        });
      }
    }
  });
}
