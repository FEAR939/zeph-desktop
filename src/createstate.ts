import {
  Subscriber,
  CreateStateReturn,
  SetStateFunction,
  SubscribeFunction,
  GetStateFunction,
} from "./types";

function createState<T>(initialValue: T): CreateStateReturn<T> {
  let currentValue: T = initialValue;
  const subscribers = new Set<Subscriber<T>>();

  const setState: SetStateFunction<T> = (newValue) => {
    if (typeof newValue === "function") {
      // Type assertion here because we know the function expects the current value type
      currentValue = (newValue as (prev: T) => T)(currentValue);
    } else {
      currentValue = newValue;
    }

    subscribers.forEach((callback) => callback(currentValue));
  };

  const subscribe: SubscribeFunction<T> = (callback) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  };

  const getValue: GetStateFunction<T> = () => currentValue;

  return [getValue, setState, subscribe];
}

export default createState;

// const [getState, setState, subscribeState] = createState(0);
// console.log(getState());
// subscribeState(newValue => console.log(newValue));
// setState(10);
// setState(11);
// setState(12);
