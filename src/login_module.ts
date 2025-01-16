import { fetch } from "@tauri-apps/plugin-http";

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

function login_constructor() {
  let content: HTMLElement | null = null;
  let home_callback: ((method: string) => void) | null = null;

  const build = (callback: () => void) => {
    if (content == null) return;
    content.innerHTML = "";

    const login_node = document.createElement("div");
    login_node.className =
      "h-full w-full flex flex-col items-center justify-center space-y-2";

    content.appendChild(login_node);

    const username_field = document.createElement("input");
    username_field.className =
      "w-96 px-4 py-2 outline-0 rounded-full bg-[#090b0c] border border-white/15 placeholder:text-white placeholder:font-medium text-white font-medium";
    username_field.placeholder = "username";

    login_node.appendChild(username_field);

    const password_field = document.createElement("input");
    password_field.className =
      "w-96 px-4 py-2 outline-0 rounded-full bg-[#090b0c] border border-white/15 placeholder:text-white placeholder:font-medium text-white font-medium";
    password_field.placeholder = "password";
    password_field.type = "password";

    login_node.appendChild(password_field);

    const submit_node = document.createElement("button");
    submit_node.className =
      "w-96 px-4 py-2 rounded-full bg-[#090b0c] border border-white/15 text-white font-medium";
    submit_node.textContent = "Login";

    login_node.appendChild(submit_node);

    submit_node.addEventListener("click", async () => {
      if (!localStorage.getItem("token")) {
        const token = await get_token(
          username_field.value,
          password_field.value,
        );
        if (!token) {
          submit_node.classList.toggle("bg-[#090b0c]");
          submit_node.classList.add("bg-red-600");
          submit_node.textContent = "Something went wrong...";

          setTimeout(() => {
            submit_node.classList.toggle("bg-[#090b0c]");
            submit_node.classList.remove("bg-red-600");
            submit_node.textContent = "Login";
          }, 3000);

          return;
        }

        submit_node.classList.toggle("bg-[#090b0c]");
        submit_node.classList.add("bg-green-600");
        submit_node.textContent = "Success!";

        setTimeout(() => {
          submit_node.classList.remove("bg-green-600");
          submit_node.classList.add("bg-blue-600");
          submit_node.textContent = "Go to Home";
        }, 3000);

        localStorage.setItem("token", token);
        callback();
      } else {
        if (home_callback == null) return;
        home_callback("update");
      }
    });
  };

  const setParams = (
    area: HTMLElement,
    callback: (method: string) => Promise<void>,
  ) => {
    content = area;
    home_callback = callback;
  };

  return {
    build: build,
    setParams: setParams,
  };
}

export default login_constructor;
