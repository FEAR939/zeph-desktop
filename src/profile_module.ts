import { fetch } from "@tauri-apps/plugin-http";
import Chart from "chart.js/auto";

async function get_activity_year() {
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
  const isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
  const profile_wrapper = document.createElement("div");
  profile_wrapper.className =
    "absolute inset-0 z-40 flex justify-center bg-neutral-950/60 backdrop-blur-xl overflow-y-auto";

  document.body.appendChild(profile_wrapper);

  const profile_node = document.createElement("div");
  profile_node.className =
    "relative min-h-[calc(100%-1rem)] h-fit w-[64rem] max-w-full px-4 mt-4 overflow-hidden border-box pt-8 flex flex-col justify-center";
  profile_node.innerHTML = `
    <div class="grid min-h-[140px] w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
      <svg class="text-gray-300 animate-spin" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
        width="24" height="24">
        <path
          d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
          stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
        <path
          d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
          stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-900">
        </path>
      </svg>
    </div>
  `;

  profile_wrapper.appendChild(profile_node);

  profile_wrapper.addEventListener("click", (e) => {
    const target = e.target as Node;
    if (!profile_node.contains(target)) {
      profile_wrapper.remove();
    }
  });

  document.body.appendChild(profile_wrapper);

  const activity = await get_activity_year();
  profile_node.innerHTML = "";

  const close = document.createElement("img");
  close.className = "absolute top-4 left-4 h-8 w-8 cursor-pointer";
  close.src = "./icons/keyboard_backspace_24dp.png";

  close.addEventListener("click", () => {
    profile_wrapper.remove();
  });

  profile_node.appendChild(close);

  const graph_wrapper = document.createElement("div");
  graph_wrapper.className =
    "w-full h-fit mt-8 px-2 pb-2 bg-neutral-950/80 backdrop-blur-xl rounded-2xl";

  profile_node.appendChild(graph_wrapper);

  graph_wrapper.insertAdjacentHTML(
    "beforeend",
    "<div class='font-semibold mb-2 pt-4 pl-2'> Playtime (Hours)</div>",
  );

  const ctx = document.createElement("canvas");

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

  // --- Start of Modifications for Option B ---

  // 1. Define the number of days for the rolling window
  const numberOfDays = 30; // How many days back from today (inclusive)

  // 2. Determine the end date (today) and start date
  const endDate = new Date(); // Today
  const startDate = new Date(); // Start date will be calculated from today

  // Set end date to midnight to standardize comparisons
  endDate.setHours(0, 0, 0, 0);

  // Calculate the start date by subtracting days
  // Subtract (numberOfDays - 1) because the range includes the end date (today)
  startDate.setDate(startDate.getDate() - (numberOfDays - 1));
  // Also set start date to midnight
  startDate.setHours(0, 0, 0, 0);

  // 3. Create an empty dataset ONLY for the days in the calculated range
  const dataset = [];

  // Loop from the start date up to the end date, incrementing by one day
  // Use a temporary date variable 'd' for iteration
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Create a *new* Date object for the current day in the loop
    // This avoids issues where all dataset entries might reference the final loop date
    const currentDate = new Date(d);

    dataset.push({
      x: `${months[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`,
      y: "0.0", // Start with zero values
      // Store a clean Date object (set to midnight) for reliable matching later
      rawDate: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
      ),
    });
  }

  // --- End of Modifications ---

  // Now fill in actual values from activity data
  activity.forEach((act) => {
    // Create a Date object for the activity, also set to midnight for comparison
    // Assuming act.month is 1-based (Jan=1), JS Date month is 0-based (Jan=0)
    const actDate = new Date(act.year, act.month - 1, act.date);
    actDate.setHours(0, 0, 0, 0);

    // Check if the activity date falls within our calculated start/end range
    if (actDate >= startDate && actDate <= endDate) {
      // Find the matching entry in our dataset by comparing year, month, and day
      const index = dataset.findIndex(
        (item) =>
          item.rawDate.getFullYear() === actDate.getFullYear() &&
          item.rawDate.getMonth() === actDate.getMonth() &&
          item.rawDate.getDate() === actDate.getDate(),
      );

      if (index !== -1) {
        // Update with actual data (time in minutes, rounded to one decimal)
        dataset[index].y = (act.time / 60).toFixed(1);
      }
    }
  });

  // Remove the helper rawDate property before using the dataset
  dataset.forEach((item) => {
    delete item.rawDate;
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
            gradient.addColorStop(0, "rgba(253, 61, 181, 0)");
            gradient.addColorStop(1, "rgba(253, 61, 181, 0.7)");
            return gradient;
          },
          borderColor: "rgb(253, 61, 181)",
          borderWidth: 2,
          data: dataset,
        },
      ],
    },
    options: {
      aspectRatio: isMobileDevice ? 2 / 1 : 3 / 1,
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
    "<div class='font-semibold mt-4 mb-2 ml-2 px-2'>History</div>",
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
  cardWrapper.className =
    "w-full h-fit space-y-2 py-2 px-4 bg-neutral-950/80 backdrop-blur-xl rounded-2xl mb-2";

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

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const serverData = anime_data[i];
    const data = await serverData.json();

    const image = data.image;
    const title = data.title;

    const card = document.createElement("div");
    card.className =
      "relative w-full h-18 p-2 flex items-center border-b border-neutral-800 last:border-none";

    const cardImage = document.createElement("img");
    cardImage.src = image.includes("https://")
      ? `${image}`
      : `https://aniworld.to${image}`;
    cardImage.className = "h-full object-cover rounded aspect-[2/3]";

    card.appendChild(cardImage);

    const date = new Date(item.created_at);
    const timezoneoffset = date.getTimezoneOffset();
    date.setMilliseconds(date.getMilliseconds() + timezoneoffset * 60 * 1000);

    const cardTitle = document.createElement("div");
    cardTitle.className = "w-full truncate px-2";
    cardTitle.textContent = `${title}`;

    card.appendChild(cardTitle);

    const cardDate = document.createElement("div");
    cardDate.className = "absolute right-2 top-1.5 text-sm text-neutral-500";
    cardDate.textContent = date.toLocaleString();

    card.appendChild(cardDate);

    cardWrapper.appendChild(card);
  }
}
