import createState from "../createstate";

export function Selector(
  parent: HTMLElement,
  options: Array<object>,
  init?: string,
) {
  const [getValue, setValue, subscribeValue] = createState<
    string | number | null
  >(null);
  const [getOptions, setOptions, subscribeOptions] = createState<Array<object>>(
    [],
  );
  const [getExpand, setExpand, subscribeExpand] = createState(false);

  const selector_node = document.createElement("div");
  selector_node.className =
    "relative h-8 w-48 flex items-center bg-neutral-950/60 backdrop-blur-xl rounded-lg outline outline-neutral-800";

  const selector_header = document.createElement("div");
  selector_header.className = "h-full w-full flex items-center cursor-pointer";

  const value_node = document.createElement("div");
  value_node.className = "h-full w-full px-2 text-sm flex items-center";
  value_node.textContent = "Select";
  if (typeof init !== "undefined") {
    value_node.textContent = init;
  }

  selector_header.appendChild(value_node);

  const expand_node = document.createElement("img");
  expand_node.className = "h-8 w-8 pr-2 shrink-0";

  selector_header.appendChild(expand_node);

  selector_header.addEventListener("click", () => setExpand(!getExpand()));

  selector_node.appendChild(selector_header);

  subscribeValue((newValue) => {
    value_node.textContent = newValue.label;
    if (newValue.title) value_node.textContent = newValue.title;
  });

  const options_node = document.createElement("div");
  options_node.className =
    "absolute h-fit w-full p-2 bottom-10 bg-neutral-950 rounded-lg outline outline-neutral-800";

  subscribeExpand((newExpand) => {
    if (newExpand) {
      options_node.style.display = "block";
      expand_node.src = "./icons/arrow_drop_up_24dp.svg";
    } else {
      options_node.style.display = "none";
      expand_node.src = "./icons/arrow_drop_down_24dp.svg";
    }
  });

  setExpand(false);

  const options_search_wrapper = document.createElement("div");
  options_search_wrapper.className =
    "h-8 w-full px-2 flex space-x-2 items-center bg-neutral-900 rounded-lg";
  options_search_wrapper.innerHTML =
    "<img src='./icons/search_24dp.svg' class='h-4 w-4' />";

  const search_input = document.createElement("input");
  search_input.className = "h-fit w-full text-sm outline-none";
  search_input.placeholder = "Search";

  options_search_wrapper.appendChild(search_input);

  options_node.appendChild(options_search_wrapper);

  const options_list = document.createElement("div");
  options_list.className =
    "h-fit max-h-96 w-full mt-2 pt-2 border-t border-neutral-600 overflow-y-scroll";
  subscribeOptions((newOptions) => {
    options_list.innerHTML = "";
    newOptions.map((option) => {
      const option_node = document.createElement("div");
      option_node.className =
        "h-8 w-full px-2 flex items-center truncate rounded-lg hover:bg-neutral-900 cursor-pointer";
      option_node.textContent = option.label;
      if (option.title) option_node.textContent = option.title;

      options_list.appendChild(option_node);

      option_node.addEventListener("click", () => {
        setExpand(false);
        setValue(option);
      });

      search_input.addEventListener("keyup", () => {
        if (
          option.label
            .toString()
            .toLowerCase()
            .includes(search_input.value.toLowerCase())
        ) {
          option_node.style.display = "flex";
        } else {
          option_node.style.display = "none";
        }
      });
    });
  });

  setOptions(options);

  options_node.appendChild(options_list);

  selector_node.appendChild(options_node);

  parent.appendChild(selector_node);

  return {
    element: selector_node,
    get: getValue,
    set: (value: string | number) => setValue(value),
    subscribe: subscribeValue,
    setOptions: (options: Array<object>) => setOptions(options),
  };
}
