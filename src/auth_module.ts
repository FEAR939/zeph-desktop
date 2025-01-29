import { fetch } from "@tauri-apps/plugin-http";
import createState from "./createstate";

const [getRegister, setRegister, subscribeRegister] = createState(false);

async function get_token(username: string, password: string) {
  try {
    const formData = new FormData();
    formData.append("username", username.toString());
    formData.append("password", password.toString());

    const json = await (
      await fetch("http://animenetwork.org/auth-login", {
        method: "POST",
        body: new URLSearchParams(
          formData as unknown as Record<string, string>,
        ),
      })
    ).json();
    return json.token;
  } catch (e) {
    console.error(e);
  }
}

async function register(username: string, password: string) {
  try {
    const formData = new FormData();
    formData.append("username", username.toString());
    formData.append("password", password.toString());

    const res = await fetch("http://animenetwork.org/auth-register", {
      method: "POST",
      body: new URLSearchParams(formData as unknown as Record<string, string>),
    });

    return res.status;
  } catch (e) {
    console.error(e);
  }
}

function auth_constructor() {
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
      "w-96 px-4 py-2 rounded-full bg-neutral-900 rounded-lg placeholder:text-white placeholder:font-medium text-white font-medium";
    username_field.placeholder = "username";

    login_node.appendChild(username_field);

    const password_field = document.createElement("input");
    password_field.className =
      "w-96 px-4 py-2 rounded-full bg-neutral-900 rounded-lg placeholder:text-white placeholder:font-medium text-white font-medium";
    password_field.placeholder = "password";
    password_field.type = "password";

    login_node.appendChild(password_field);

    const submit_node = document.createElement("button");
    submit_node.className =
      "w-96 px-4 py-2 rounded-full bg-neutral-900 rounded-lg text-white font-medium cursor-pointer";

    subscribeRegister((newRegister) => {
      if (newRegister) {
        submit_node.textContent = "Register";
      } else {
        submit_node.textContent = "Login";
      }
    });

    login_node.appendChild(submit_node);

    function statusgood() {
      submit_node.classList.toggle("bg-neutral-900");
      submit_node.classList.add("bg-green-600");
      submit_node.textContent = "Success!";

      setTimeout(() => {
        submit_node.classList.remove("bg-green-600");
        submit_node.classList.add("bg-blue-600");

        if (getRegister()) {
          submit_node.textContent = "Go to Login";
        } else {
          submit_node.textContent = "Go to Home";
        }
      }, 3000);
    }

    function statusbad() {
      submit_node.classList.toggle("bg-neutral-900");
      submit_node.classList.add("bg-red-600");
      submit_node.textContent = "Something went wrong...";

      setTimeout(() => {
        submit_node.classList.toggle("bg-neutral-900");
        submit_node.classList.remove("bg-red-600");
        submit_node.textContent = "Login";
      }, 3000);
    }

    submit_node.addEventListener("click", async () => {
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

          statusgood();

          if (login_callback == null) return;
          login_callback(token);
        }
      } else {
        if (home_callback == null) return;
        home_callback("update");
      }
    });

    const changeRegister = document.createElement("div");
    changeRegister.className = "h-8 text-sm";

    login_node.appendChild(changeRegister);

    subscribeRegister((newRegister) => {
      if (newRegister) {
        changeRegister.textContent = "Login with existing account instead.";
      } else {
        changeRegister.textContent = "Create a new account.";
      }
    });

    changeRegister.addEventListener("click", () => setRegister(!getRegister()));

    setRegister(false);
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
