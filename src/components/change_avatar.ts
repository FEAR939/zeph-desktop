export function AvatarChanger(parent: HTMLElement, userState) {
  const modal = document.createElement("div");
  modal.className =
    "absolute inset-0 h-fit w-64 p-4 m-auto bg-neutral-700 rounded-[18px]";

  function ImageCropper(file) {
    modal.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.className = "h-fit w-full object-contain rounded-[12px]";

    modal.appendChild(canvas);

    const scaleInput = document.createElement("input");
    scaleInput.className = "h-1 w-full";
    scaleInput.type = "range";
    scaleInput.min = "1";
    scaleInput.max = "10";
    scaleInput.value = "5";

    modal.appendChild(scaleInput);

    const submit = document.createElement("div");
    submit.className = "px-4 py-2 rounded-lg bg-neutral-600 mt-2";
    submit.textContent = "Submit";

    modal.appendChild(submit);

    const ctx = canvas.getContext("2d");

    const image = new Image();
    image.src = URL.createObjectURL(file);

    image.addEventListener("load", () => {
      canvas.height = image.naturalHeight;
      canvas.width = image.naturalWidth;

      let pointX = Math.floor(image.naturalWidth / 2);
      let pointY = Math.floor(image.naturalHeight / 2);

      let drag = false;

      canvas.addEventListener("mousedown", () => {
        drag = true;
      });

      canvas.addEventListener("mouseup", () => {
        drag = false;
      });

      canvas.addEventListener("mousemove", (e: MouseEvent) => {
        if (!drag) return;

        pointX = e.offsetX * (image.naturalWidth / canvas.clientWidth);
        pointY = e.offsetY * (image.naturalHeight / canvas.clientHeight);

        drawArea(pointX, pointY, parseInt(scaleInput.value) / 10);
      });

      scaleInput.addEventListener("change", () => {
        drawArea(pointX, pointY, parseInt(scaleInput.value) / 10);
      });

      drawArea(pointX, pointY, parseInt(scaleInput.value) / 10);

      submit.addEventListener("click", async () => {
        const bounds = bound(
          image,
          parseInt(scaleInput.value) / 10,
          pointX,
          pointY,
        );

        ctx?.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

        const imageData = ctx?.getImageData(
          bounds.x1,
          bounds.y1,
          bounds.x2 - bounds.x1,
          bounds.y4 - bounds.y1,
        );

        if (!imageData) return;

        const file = await toFile(imageData);

        if (!file || !localStorage.getItem("token")) return;

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("http://animenetwork.org/avatar-upload", {
          method: "POST",
          headers: {
            Authorization: localStorage.getItem("token") || "",
          },
          body: formData,
        });

        if (response.status !== 200) return;
        const json = await response.json();
        const user = userState.get();
        user.avatar_url = json.url;
        userState.set(user);

        modal.remove();
      });
    });

    function drawArea(x: number, y: number, scale: number) {
      if (!ctx) return;
      ctx.reset();
      ctx?.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
      ctx.strokeStyle = "rgb(255, 0, 0, 1";

      const bounds = bound(image, scale, x, y);
      ctx.beginPath();
      ctx.moveTo(bounds.x1, bounds.y1);
      ctx.lineTo(bounds.x2, bounds.y2);
      ctx.lineTo(bounds.x3, bounds.y3);
      ctx.lineTo(bounds.x4, bounds.y4);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function bound(image, scale, x, y) {
    const xHalf = image.naturalWidth / 2;
    const yHalf = image.naturalHeight / 2;
    const smallHalf = Math.min(xHalf, yHalf);
    const x1 = Math.max(
      Math.min(
        x - smallHalf * scale,
        image.naturalWidth - smallHalf * 2 * scale,
      ),
      0,
    );
    const y1 = Math.max(
      Math.min(
        y - smallHalf * scale,
        image.naturalHeight - smallHalf * 2 * scale,
      ),
      0,
    );
    const x2 = Math.max(
      Math.min(x + smallHalf * scale, image.naturalWidth),
      smallHalf * 2 * scale,
    );
    const y2 = Math.max(
      Math.min(
        y - smallHalf * scale,
        image.naturalHeight - smallHalf * 2 * scale,
      ),
      0,
    );
    const x3 = Math.max(
      Math.min(x + smallHalf * scale, image.naturalWidth),
      smallHalf * 2 * scale,
    );
    const y3 = Math.max(
      Math.min(y + smallHalf * scale, image.naturalHeight),
      smallHalf * 2 * scale,
    );
    const x4 = Math.max(
      Math.min(
        x - smallHalf * scale,
        image.naturalWidth - smallHalf * 2 * scale,
      ),
      0,
    );
    const y4 = Math.max(
      Math.min(y + smallHalf * scale, image.naturalHeight),
      smallHalf * 2 * scale,
    );

    return {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      x3: x3,
      y3: y3,
      x4: x4,
      y4: y4,
    };
  }

  async function toFile(imageData: ImageData) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.height = imageData.height;
      canvas.width = imageData.width;
      ctx?.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "avatar.png");
        const dT = new DataTransfer();
        dT.items.add(file);

        resolve(dT.files[0]);
      });
    });
  }

  const fileWrapper = document.createElement("div");
  fileWrapper.className =
    "relative h-32 w-full flex items-center justify-center";
  fileWrapper.innerHTML =
    "<img src='./icons/upload_24dp.png' class='h-8 w-8' />";

  const fileInput = document.createElement("input");
  fileInput.className = "absolute inset-0 h-full w-full opacity-0";
  fileInput.type = "file";

  fileWrapper.appendChild(fileInput);

  modal.appendChild(fileWrapper);

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0] == null) return;
    ImageCropper(fileInput.files[0]);
  });

  parent.appendChild(modal);
}
