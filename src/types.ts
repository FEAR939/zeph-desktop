export type Subscriber<T> = (value: T) => void;
export type SetStateFunction<T> = (value: T | ((prev: T) => T)) => void;
export type GetStateFunction<T> = () => T;
export type SubscribeFunction<T> = (callback: Subscriber<T>) => () => void;
export type CreateStateReturn<T> = [
  GetStateFunction<T>,
  SetStateFunction<T>,
  SubscribeFunction<T>,
];

export type categorie = {
  label: string;
  items: anime_data[];
};

export type search_result = {
  title: string;
  link: string;
};

export type anime_data = {
  redirect: string;
  image: string;
  title: string;
};

export type anime = {
  series_id: string;
};

export type anime_details = {
  title: string;
  desc: string;
  image: string;
  rating: string;
  imdb: string;
  seasons: season[];
};

export type season = {
  label: string;
  redirect: string;
};

export type api_episode = {
  episode_id: string;
  watch_duration: number;
  watch_playtime: number;
};

export type episode = {
  redirect: string;
  title: string;
  image: string;
  duration: number;
  playtime: number;
  id: string;
  langs: string[];
  watched:
    | ((duration: number, playtime: number, timertime: number) => Promise<void>)
    | null;
};
