import { fetch } from "@tauri-apps/plugin-http";
import Chart from "chart.js/auto";

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
    "relative min-h-[calc(100%-1rem)] h-fit w-[64rem] max-w-full bg-neutral-900 mt-4 p-4 pt-12 overflow-hidden rounded-t-lg border-box";

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

  const graph_wrapper = document.createElement("div");
  graph_wrapper.className = "w-full h-fit mt-2";

  profile_node.appendChild(graph_wrapper);

  graph_wrapper.insertAdjacentHTML(
    "beforeend",
    "<div class='font-semibold pt-4 pl-4'> Playtime (Hours)</div>",
  );

  const ctx = document.createElement("canvas");
  ctx.className = "p-4";

  graph_wrapper.appendChild(ctx);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dataset = [];
  const currentDate = new Date().getDate();

  activity.map((act, i) => {
    dataset.push({
      x: `${months[act.month - 1]} ${act.date}`,
      y: (act.time / 60).toFixed(1),
    });

    if (act.date >= currentDate || act.date > activity[i + 1]?.date) return;

    const gap = Math.abs(act.date + 1 - (activity[i + 1]?.date || act.date));

    if (gap == 0) return;

    for (let j = 0; j < gap; j++) {
      dataset.push({
        x: `${months[act.month - 1]} ${act.date + j + 1}`,
        y: 0,
      });
    }
  });

  const yScaleText = {
    id: "yScaleText",
    beforeDatasetsDraw(chart, args, plugins) {
      const {
        ctx,
        scales: { y },
      } = chart;

      const yCenter = y.left;

      ctx.save();
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Hours", yCenter, y.top - 10);
    },
  };

  const cursorLinePlugin = {
    id: "cursorLine",
    beforeDraw: (chart) => {
      if (chart.tooltip._active && chart.tooltip._active.length) {
        const activePoint = chart.tooltip._active[0];
        const { ctx } = chart;
        const { x } = activePoint.element;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;

        // Draw vertical line
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    },
  };

  // UniFi-style endpoint dots plugin

  // Your modified chart code
  new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Activity",
          cubicInterpolationMode: "default",
          tension: 0.2,
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
            gradient.addColorStop(0, "rgba(52, 204, 255, 0)");
            gradient.addColorStop(1, "rgba(52, 204, 255, 0.7)");
            return gradient;
          },
          borderColor: "rgb(52, 204, 255)",
          borderWidth: 1,
          data: dataset,
        },
      ],
    },
    options: {
      aspectRatio: 3 / 1,
      scales: {
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#888",
            font: {
              size: 11,
            },
          },
        },
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#888",
            font: {
              size: 11,
            },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        tooltip: {
          backgroundColor: "#333",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#555",
          borderWidth: 1,
          cornerRadius: 3,
          padding: 8,
          displayColors: true,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          callbacks: {
            title: function (tooltipItems) {
              return tooltipItems[0].label;
            },
          },
        },
        legend: {
          display: false, // Hide legend as in UniFi style
        },
      },
      elements: {
        point: {
          radius: 0, // Hide all points by default
        },
        line: {
          borderWidth: 2, // Slightly thicker line for better visibility
        },
      },
      hover: {
        mode: "index",
        intersect: false,
      },
    },
    plugins: [cursorLinePlugin, yScaleText],
  });

  profile_node.insertAdjacentHTML(
    "beforeend",
    "<div class='font-semibold mt-4 mb-2 ml-4'>History</div>",
  );

  let page = 0;
  const items = await (
    await fetch(
      `${localStorage.getItem("api_url")}/user/getHistory?page=${page}`,
      {
        headers: {
          Authorization: localStorage.getItem("token") || "",
        },
      },
    )
  ).json();

  const cardWrapper = document.createElement("div");
  cardWrapper.className = "w-full h-fit space-y-2 p-4";

  profile_node.appendChild(cardWrapper);

  const anime_data = await Promise.all(
    items.map(async (item) => {
      const serverData = await fetch(
        `${localStorage.getItem("api_url")}/get-anime`,
        {
          method: "POST",
          body: item.anime_id,
        },
      );

      return serverData;
    }),
  );

  items.map(async (item, i) => {
    const serverData = anime_data[i];
    const data = await serverData.json();

    const image = data.image;
    const title = data.title;

    const card = document.createElement("div");
    card.className = "w-full h-24 p-2 rounded-md flex bg-neutral-800";

    const cardImage = document.createElement("img");
    cardImage.src = `https://aniworld.to${image}`;
    cardImage.className = "h-full object-cover rounded aspect-[2/3]";

    card.appendChild(cardImage);

    const date = new Date(item.created_at);
    date.setHours(date.getHours() - 1);

    const cardContent = document.createElement("div");
    cardContent.className = "w-full h-full px-2";
    cardContent.innerHTML = `<div class="font-semibold">${title}</div><div class="text-neutral-500">${date.toLocaleString()}</div>`;

    card.appendChild(cardContent);

    cardWrapper.appendChild(card);
  });
}
