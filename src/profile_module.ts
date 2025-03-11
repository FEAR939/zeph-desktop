import { fetch } from "@tauri-apps/plugin-http";
import Chart from "chart.js/auto";
import Devider from "./components/devider";

async function get_activity_month() {
  const res = await fetch(
    `${localStorage.getItem("api_url")}/user/activity/last-month`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
    },
  );

  if (res.status !== 200) {
    return [];
  }

  const activity = await res.json();
  return activity;
}

export default async function profile_panel(userState) {
  const profile_wrapper = document.createElement("div");
  profile_wrapper.className =
    "absolute inset-0 z-40 flex justify-center backdrop-brightness-50 overflow-y-auto";

  document.body.appendChild(profile_wrapper);

  const profile_node = document.createElement("div");
  profile_node.className =
    "relative min-h-[calc(100%-1rem)] h-fit w-[64rem] max-w-full bg-neutral-950 mt-4 p-4 pt-12 overflow-hidden rounded-t-lg border-box";

  profile_wrapper.appendChild(profile_node);

  profile_wrapper.addEventListener("click", (e) => {
    const target = e.target as Node;
    if (!profile_node.contains(target)) {
      profile_wrapper.remove();
    }
  });

  document.body.appendChild(profile_wrapper);

  const activity = await get_activity_month();

  const close = document.createElement("img");
  close.className = "absolute top-4 left-4 h-8 w-8 cursor-pointer";
  close.src = "./icons/keyboard_backspace_24dp.png";

  close.addEventListener("click", () => {
    profile_wrapper.remove();
  });

  profile_node.appendChild(close);

  profile_node.insertAdjacentHTML(
    "beforeend",
    "<div class='w-full font-semibold'> Playtime</div>",
  );

  const ctx = document.createElement("canvas");
  ctx.className = "p-4 mt-4 border border-neutral-900 rounded-xl";

  profile_node.appendChild(ctx);

  const dataset = [];

  activity.map((act, i) => {
    dataset.push({
      x: `${act.date}`,
      y: (act.time / 60).toFixed(1),
    });
  });

  new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Activity",
          cubicInterpolationMode: "default",
          tension: 0.4,
          fill: true,
          backgroundColor: function (context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;

            if (!chartArea) {
              // This case happens on initial chart load
              return;
            }

            // Create gradient
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.bottom,
              0,
              chartArea.top,
            );
            gradient.addColorStop(0, "rgba(160, 32, 240, 0)");
            gradient.addColorStop(1, "rgba(160, 32, 240, 0.3)");

            return gradient;
          },
          borderColor: "rgb(160, 32, 240)",
          borderWidth: 1,
          pointStyle: false,
          data: dataset,
        },
      ],
    },
    options: {
      aspectRatio: 3 / 1,
      scales: {
        y: {
          position: "right",
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}
