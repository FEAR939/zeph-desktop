async function top_constructor(
  top: HTMLElement,
  login_callback: any,
  watch_callback: any,
) {
  const top_node = document.createElement("div");
  top_node.className =
    "relative h-full w-full flex items-center justify-end px-4";

  top.appendChild(top_node);

  const search_node = document.createElement("div");
  search_node.className =
    "absolute z-10 inset-0 mx-auto mt-3 h-8 hover:h-fit w-96 rounded-lg bg-neutral-800 overflow-hidden";

  top_node.appendChild(search_node);

  const search_wrapper = document.createElement("div");
  search_wrapper.className = "h-8 w-full flex items-center space-x-4 px-4";
  search_wrapper.innerHTML =
    "<img src='../assets/search_24dp.png' class='h-4 w-4' />";

  search_node.appendChild(search_wrapper);

  const search_input = document.createElement("input");
  search_input.className = "flex-1 h-8 bg-transparent border-0 outline-0";
  search_input.placeholder = "Search for anime...";

  search_wrapper.appendChild(search_input);

  const search_results = document.createElement("div");
  search_results.className = "h-fit max-h-96 w-full overflow-y-scroll";

  search_node.appendChild(search_results);

  search_input.addEventListener("keyup", async (event) => {
    if (event.key !== "Enter" || search_input.value.trim().length == 0) return;

    const formData = new FormData();
    formData.append("keyword", search_input.value);

    const json = await (
      await fetch("https://aniworld.to/ajax/search", {
        method: "POST",
        body: new URLSearchParams(
          formData as unknown as Record<string, string>,
        ),
      })
    ).json();

    search_results.innerHTML = "";
    search_results.classList.add("border-t", "border-neutral-700");

    json.forEach((item: any) => {
      if (!item.link.includes("/anime/stream/")) return;

      const search_result = document.createElement("div");
      search_result.className =
        "h-8 w-full px-4 flex items-center hover:bg-neutral-700";
      search_result.innerHTML = `<div class='truncate'>${item.title.replace("<em>", "").replace("</em>", "")}</div>`;

      search_results.appendChild(search_result);

      search_result.addEventListener("click", () => watch_callback(item.link));
    });
  });

  const account_node = document.createElement("div");
  account_node.className =
    "w-8 h-8 rounded-full bg-neutral-600 flex items-center space-x-4 overflow-hidden";

  top_node.appendChild(account_node);

  const build_account = async () => {
    account_node.innerHTML = "";

    if (localStorage.getItem("token")) {
      const json = await (
        await fetch("http://animenetwork.org/get-avatar", {
          headers: {
            Authorization: localStorage.getItem("token") || "",
          },
        })
      ).json();

      const asyncImage = new Image();
      asyncImage.src = json.avatar_url;
      asyncImage.className = "h-full w-full object-cover";

      asyncImage.addEventListener("load", () => {
        account_node.appendChild(asyncImage);
      });
    } else {
      const login_node = document.createElement("div");
      login_node.className = "h-full w-full flex items-center justify-center";
      login_node.innerHTML =
        "<img src='../assets/person_24dp.png' class='h-4 w-4' />";

      account_node.appendChild(login_node);

      login_node.addEventListener("click", () => login_callback(build_account));
    }
  };

  build_account();
}

export default top_constructor;
