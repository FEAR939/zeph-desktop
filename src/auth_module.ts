import { fetch } from "@tauri-apps/plugin-http";
import createState from "./createstate";
import { SubscribeFunction } from "./types";

const [getRegister, setRegister, subscribeRegister] = createState(false);

async function get_token(username: string, password: string) {
  try {
    const formData = new FormData();
    formData.append("username", username.toString());
    formData.append("password", password.toString());

    const json = await fetch(`${localStorage.getItem("api_url")}/auth-login`, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(formData as unknown as Record<string, string>),
    });

    if (json.status !== 200) throw new Error("Login failed");

    const parsedJson = await json.json();

    return parsedJson.token;
  } catch (e) {
    console.error(e);
  }
}

async function register(username: string, password: string) {
  try {
    const formData = new FormData();
    formData.append("username", username.toString());
    formData.append("password", password.toString());

    const res = await fetch(
      `${localStorage.getItem("api_url")}/auth-register`,
      {
        method: "POST",
        body: new URLSearchParams(
          formData as unknown as Record<string, string>,
        ),
      },
    );

    return res.status;
  } catch (e) {
    console.error(e);
  }
}

function auth_constructor(loginSignal: SubscribeFunction<object | null>) {
  let content: HTMLElement | null = null;
  let home_callback: ((method: string) => void) | null = null;
  let login_callback: ((token: string) => void) | null = null;

  const build = () => {
    if (content == null) return;
    content.innerHTML = "";

    const login_node = document.createElement("div");
    login_node.className =
      "h-full w-full flex flex-col items-center justify-center space-y-2";

    content.appendChild(login_node);

    const username_field = document.createElement("input");
    username_field.className =
      "w-96 px-4 py-2 rounded-full bg-neutral-900 rounded-lg placeholder:text-neutral-700 placeholder:font-medium text-white font-medium";
    username_field.placeholder = "Username";

    login_node.appendChild(username_field);

    const password_field = document.createElement("input");
    password_field.className =
      "w-96 px-4 py-2 rounded-full bg-neutral-900 rounded-lg placeholder:text-neutral-700 placeholder:font-medium text-white font-medium";
    password_field.placeholder = "Password";
    password_field.type = "password";

    login_node.appendChild(password_field);

    const submit_node = document.createElement("button");
    submit_node.className =
      "w-96 px-4 py-2 mt-4 rounded-full bg-neutral-900 rounded-lg text-white font-medium cursor-pointer";

    subscribeRegister((newRegister) => {
      if (newRegister) {
        submit_node.textContent = "Sign up";
      } else {
        submit_node.textContent = "Sign in";
      }
    });

    login_node.appendChild(submit_node);

    function statusgood() {
      submit_node.classList.remove("animate-pulse");
      submit_node.classList.toggle("bg-neutral-900");
      submit_node.classList.add("bg-green-600");
      submit_node.textContent = "Success!";

      setTimeout(() => {
        submit_node.classList.remove("bg-green-600");
        submit_node.classList.add("bg-blue-600");

        if (getRegister()) {
          submit_node.textContent = "Continue Sign in";
        }
      }, 3000);
    }

    function statusbad() {
      submit_node.classList.remove("animate-pulse");
      submit_node.classList.toggle("bg-neutral-900");
      submit_node.classList.add("bg-red-600");
      submit_node.textContent = "Something went wrong...";

      setTimeout(() => {
        submit_node.classList.toggle("bg-neutral-900");
        submit_node.classList.remove("bg-red-600");
        submit_node.textContent = "Sign in";
      }, 3000);
    }

    submit_node.addEventListener("click", async () => {
      submit_node.classList.add("animate-pulse");
      if (!localStorage.getItem("token")) {
        if (getRegister()) {
          const resStatus = await register(
            username_field.value,
            password_field.value,
          );

          if (resStatus == 201) {
            statusgood();
            setRegister(false);
          } else {
            statusbad();
          }
        } else {
          const token = await get_token(
            username_field.value,
            password_field.value,
          );

          if (!token) {
            statusbad();

            return;
          }

          if (login_callback == null) return;
          login_callback(token);
        }
      } else {
        if (home_callback == null) return;
        home_callback("update");
      }
    });

    const changeRegister = document.createElement("div");
    changeRegister.className = "h-8 w-96 text-sm text-neutral-600";

    login_node.appendChild(changeRegister);

    subscribeRegister((newRegister) => {
      if (newRegister) {
        changeRegister.innerHTML =
          "Already have an account? <span class='text-white cursor-pointer'>Sign in.</span>";
      } else {
        changeRegister.innerHTML =
          "Don't have an account? <span class='text-white cursor-pointer'>Sign up.</span>";
      }
    });

    changeRegister.addEventListener("click", () => setRegister(!getRegister()));

    setRegister(false);

    loginSignal((newLogin) => {
      if (newLogin == null) return;
      login_node.innerHTML = "";

      const userModal = document.createElement("div");
      userModal.className =
        "h-fit w-96 p-4 flex flex-col space-y-1 overflow-hidden border border-white/5 rounded-lg";

      const modalMessage = document.createElement("div");
      modalMessage.className = "w-full";
      modalMessage.textContent = "You're logged in as";

      userModal.appendChild(modalMessage);

      const user = document.createElement("div");
      user.className = "w-full mb-8 flex space-x-2 items-center";
      user.innerHTML = `
        <img src="${localStorage.getItem("api_url") + newLogin.avatar_url}" class="h-8 w-8 rounded-full" />
        <span class="font-medium">${newLogin.username}</span>
        `;

      userModal.appendChild(user);

      const takeBack = document.createElement("button");
      takeBack.className = "w-full p-2 bg-blue-800 rounded-full cursor-pointer";
      takeBack.textContent = "Continue";

      userModal.appendChild(takeBack);

      takeBack.addEventListener("click", () => {
        if (home_callback == null) return;
        home_callback("update");
      });

      login_node.appendChild(userModal);
    });
  };

  const setParams = (
    area: HTMLElement,
    callback: (method: string) => Promise<void>,
    login: (token: string) => void,
  ) => {
    content = area;
    home_callback = callback;
    login_callback = login;
  };

  return {
    build: build,
    setParams: setParams,
  };
}

export default auth_constructor;
