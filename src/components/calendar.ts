import { fetch } from "@tauri-apps/plugin-http";

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
        const ep = anim
          .querySelector("small:first-of-type")
          ?.textContent?.trim();
        const time = anim
          .querySelector("small:last-of-type")
          ?.textContent?.trim()
          .substring(2, 7);

        const item = {
          title: title || "",
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
    "p-2 m-4 bg-neutral-900 rounded-[18px] flex overflow-hidden overflow-x-scroll";

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

  if (schedule.length == 0)
    return (calendar_wrapper.textContent = "No Calendar data available");

  schedule.map((day) => {
    const column = document.createElement("div");
    column.className = "shrink-0 h-full w-[calc(100%/7)]";

    calendar_wrapper.appendChild(column);

    const dateText = document.createElement("div");
    dateText.className =
      "h-16 w-full flex flex-col items-center justify-center";
    dateText.innerHTML = `<span>${day.day}</span><span>${day.date}</span>`;

    column.appendChild(dateText);

    const columnScroll = document.createElement("div");
    columnScroll.className =
      "h-[36rem] w-full p-2 overflow-y-scroll flex flex-col space-y-2";

    column.appendChild(columnScroll);

    day.items.map((item) => {
      const itemNode = document.createElement("div");
      itemNode.className =
        "relative shrink-0 h-16 w-full p-2 bg-neutral-800 rounded-lg";

      columnScroll.appendChild(itemNode);

      const itemText = document.createElement("div");
      itemText.className = "w-full text-sm font-medium truncate";
      itemText.textContent = item.title;

      itemNode.appendChild(itemText);

      const itemEpisode = document.createElement("div");
      itemEpisode.className = "text-sm";
      itemEpisode.textContent = item.ep;

      itemNode.appendChild(itemEpisode);

      const itemTime = document.createElement("div");
      itemTime.className =
        "absolute right-2 bottom-2 text-sm bg-blue-400 rounded-lg px-2";
      itemTime.textContent = item.time;

      itemNode.appendChild(itemTime);
    });
  });
}
