import createState from "../createstate";
import { card } from "./card";
import { categorie, anime_data } from "../types";

export function carousel(
  categorie: categorie,
  content: HTMLElement,
  watch_callback: (url: string) => void,
  mylist_handler: (method: string, data?: anime_data) => Promise<void>,
) {
  if (content == null) return;
  const [getCardCount, setCardCount, subscribeCardCount] = createState(
    Math.floor(window.innerWidth / 250),
  );

  window.addEventListener("resize", () => {
    setCardCount(Math.floor(window.innerWidth / 250));
  });

  const [getSliderIndex, setSliderIndex, subscribeSliderIndex] = createState(0);

  let maxSliderIndex = Math.ceil(categorie.items.length / getCardCount() - 1);

  subscribeCardCount((newCount) => {
    maxSliderIndex = Math.ceil(categorie.items.length / newCount - 1);
    if (getSliderIndex() > maxSliderIndex) setSliderIndex(maxSliderIndex);
  });

  const scroll = (container: HTMLElement, direction: string) => {
    if (
      (direction == "left" && getSliderIndex() == 0) ||
      (direction == "right" && getSliderIndex() == maxSliderIndex)
    )
      return;

    if (direction == "left") {
      setSliderIndex(getSliderIndex() - 1);
    } else {
      setSliderIndex(getSliderIndex() + 1);
    }
  };

  const categorie_node = document.createElement("div");
  categorie_node.className = "relative mt-4 mb-12";

  content.appendChild(categorie_node);

  const categorie_label = document.createElement("h2");
  categorie_label.className = "h-8 text-xl font-medium px-10 mb-4";
  categorie_label.textContent = categorie.label;

  categorie_node.appendChild(categorie_label);

  const carousel_previous = document.createElement("button");
  carousel_previous.className =
    "absolute left-0 top-[46px] bottom-[-2px] w-[30px] flex items-center justify-center z-10 bg-black bg-opacity-50 rounded-r-lg hover:bg-opacity-75 transition-all ease-in-out duration-300";
  carousel_previous.innerHTML =
    "<img src='./icons/chevron_left_24dp.png' class='h-8 w-8' />";
  carousel_previous.style.opacity = "0";

  categorie_node.appendChild(carousel_previous);

  const carousel_next = document.createElement("button");
  carousel_next.className =
    "absolute right-0 top-[46px] bottom-[-2px] w-[30px] flex items-center justify-center z-10 bg-black bg-opacity-50 rounded-l-lg hover:bg-opacity-75 transition-all ease-in-out duration-300";
  carousel_next.innerHTML =
    "<img src='./icons/chevron_right_24dp.png' class='h-8 w-8' />";
  carousel_next.style.opacity = "0";

  categorie_node.appendChild(carousel_next);

  const handle_visible = (index: number) => {
    let prevVisible = "0";
    let nextVisible = "0";
    if (index == 0 && index !== maxSliderIndex) {
      nextVisible = "1";
    } else if (index !== 0 && index !== maxSliderIndex) {
      prevVisible = "1";
      nextVisible = "1";
    } else if (index !== 0 && index == maxSliderIndex) {
      prevVisible = "1";
    }

    carousel_previous.style.opacity = prevVisible;
    carousel_next.style.opacity = nextVisible;
  };

  handle_visible(getSliderIndex());

  subscribeSliderIndex((newIndex) => {
    handle_visible(newIndex);
  });

  subscribeCardCount(() => {
    handle_visible(getSliderIndex());
  });

  const categorie_carousel = document.createElement("div");
  categorie_carousel.className =
    "flex mx-8 scroll-smooth transition-all ease-in-out duration-500";

  categorie_node.appendChild(categorie_carousel);

  subscribeSliderIndex(
    (newIndex) =>
      (categorie_carousel.style.transform = `translate3D(calc(${newIndex} * -100%), 0, 0)`),
  );

  carousel_previous.addEventListener("click", () =>
    scroll(categorie_carousel, "left"),
  );
  carousel_next.addEventListener("click", () =>
    scroll(categorie_carousel, "right"),
  );

  categorie.items.forEach((item: anime_data) => {
    card(
      item,
      categorie_carousel,
      watch_callback,
      mylist_handler,
      getCardCount,
      subscribeCardCount,
    );
  });
}
