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
    "absolute inset-0 z-40 flex justify-center backdrop-brightness-50 overflow-y-auto";

  document.body.appendChild(profile_wrapper);

  const profile_node = document.createElement("div");
  profile_node.className =
    "relative min-h-[calc(100%-1rem)] h-fit w-[64rem] max-w-full bg-[rgb(6,6,6)] outline outline-[hsla(0,0%,100%,0.15)] mt-4 overflow-hidden rounded-t-lg border-box pt-8";

  profile_wrapper.appendChild(profile_node);

  profile_wrapper.addEventListener("click", (e) => {
    const target = e.target as Node;
    if (!profile_node.contains(target)) {
      profile_wrapper.remove();
    }
  });

  document.body.appendChild(profile_wrapper);

  const activity = await get_activity_year();

  const close = document.createElement("img");
  close.className = "absolute top-4 left-4 h-8 w-8 cursor-pointer";
  close.src = "./icons/keyboard_backspace_24dp.png";

  close.addEventListener("click", () => {
    profile_wrapper.remove();
  });

  profile_node.appendChild(close);

  const graph_wrapper = document.createElement("div");
  graph_wrapper.className = "w-full h-fit mt-2 px-2";

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
  cardWrapper.className = "w-full h-fit space-y-2 py-2 px-4";

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
      "w-full h-18 p-2 flex items-center border-b border-[hsla(0,0%,100%,0.15)] last:border-none";

    const cardImage = document.createElement("img");
    cardImage.src = `https://aniworld.to${image}`;
    cardImage.className = "h-full object-cover rounded aspect-[2/3]";

    card.appendChild(cardImage);

    const date = new Date(item.created_at);
    const timezoneoffset = date.getTimezoneOffset();
    date.setMilliseconds(date.getMilliseconds() + timezoneoffset * 60 * 1000);

    const cardTitle = document.createElement("div");
    cardTitle.className = "truncate max-w-[calc(100%-12rem)] px-2";
    cardTitle.textContent = `${title}`;

    card.appendChild(cardTitle);

    const cardDate = document.createElement("div");
    cardDate.className = "ml-auto text-neutral-500";
    cardDate.textContent = date.toLocaleString();

    card.appendChild(cardDate);

    cardWrapper.appendChild(card);
  }
}
