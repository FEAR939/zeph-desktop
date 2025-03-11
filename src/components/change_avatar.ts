export function AvatarChanger(parent: HTMLElement, userState) {
  const modal = document.createElement("div");
  modal.className =
    "absolute inset-0 h-fit w-64 p-4 m-auto bg-neutral-950 border border-neutral-800 rounded-xl";

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
    submit.className =
      "px-4 py-2 flex items-center justify-center rounded bg-neutral-900 hover:bg-neutral-800 mt-2 transition-colors cursor-pointer";
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

      canvas.addEventListener("touchstart", (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling when touching the canvas
        if (e.touches.length > 0) {
          drag = true;

          const rect = canvas.getBoundingClientRect();
          const touchX = e.touches[0].clientX - rect.left;
          const touchY = e.touches[0].clientY - rect.top;

          pointX = touchX * (image.naturalWidth / canvas.clientWidth);
          pointY = touchY * (image.naturalHeight / canvas.clientHeight);

          drawArea(pointX, pointY, parseInt(scaleInput.value) / 10);
        }
      });

      canvas.addEventListener("touchmove", (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling when touching the canvas
        if (!drag || e.touches.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;

        pointX = touchX * (image.naturalWidth / canvas.clientWidth);
        pointY = touchY * (image.naturalHeight / canvas.clientHeight);

        drawArea(pointX, pointY, parseInt(scaleInput.value) / 10);
      });

      canvas.addEventListener("touchend", () => {
        drag = false;
      });

      canvas.addEventListener("touchcancel", () => {
        drag = false;
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

        modal.innerHTML = "";

        const progressNumber = document.createElement("div");
        progressNumber.className =
          "w-full mb-1 flex items-center justify-center text-neutral-600";
        progressNumber.textContent = "Preparing...";

        modal.appendChild(progressNumber);

        const progressBar = document.createElement("div");
        progressBar.className =
          "w-full h-1 bg-neutral-900 rounded-full overflow-hidden";

        const progress = document.createElement("div");
        progress.className = "h-full bg-white";
        progress.style.width = "0";

        progressBar.appendChild(progress);

        modal.appendChild(progressBar);

        const finish = document.createElement("div");
        finish.className =
          "w-full px-2 py-1 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 transition-colors text-neutral-700 rounded cursor-pointer mt-4";
        finish.textContent = "Finish";

        modal.appendChild(finish);

        const updateProgress = (percent: number) => {
          progressNumber.textContent = `${percent}%`;
          progress.style.width = `${percent}%`;
        };

        const response = await uploadFileWithProgress(file, updateProgress);

        const user = userState.get();
        user.avatar_url = response.url;
        userState.set(user);

        finish.classList.replace("text-neutral-700", "text-white");

        finish.addEventListener("click", () => {
          modal.remove();
        });
      });
    });

    function uploadFileWithProgress(
      file: File,
      progressCallback: (percent: number) => void,
    ): Promise<any> {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiUrl = localStorage.getItem("api_url") || "";
        const token = localStorage.getItem("token") || "";

        // Setup form data
        const formData = new FormData();
        formData.append("file", file);

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100,
            );
            progressCallback(percentComplete);
          }
        });

        // Handle response
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error("Failed to parse response"));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          reject(new Error("Network error occurred during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was aborted"));
        });

        // Open and send the request
        xhr.open("POST", `${apiUrl}/avatar-upload`);
        xhr.setRequestHeader("Authorization", token);
        xhr.send(formData);
      });
    }

    function drawArea(x: number, y: number, scale: number) {
      if (!ctx) return;

      // Get the bounds for the selection area
      const bounds = bound(image, scale, x, y);

      // Calculate the center of the bounding box
      const centerX = bounds.x1 + (bounds.x2 - bounds.x1) / 2;
      const centerY = bounds.y1 + (bounds.y4 - bounds.y1) / 2;

      // Calculate the radius - use the smaller of width/height to ensure circle fits in box
      const width = bounds.x2 - bounds.x1;
      const height = bounds.y4 - bounds.y1;
      const radius = Math.min(width, height) / 2;

      // Clear the canvas first
      ctx.reset();

      // Step 1: Draw the original image
      ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

      // Step 2: Save the current state
      ctx.save();

      // Step 3: Create a clipping region outside the circle
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true); // Note the 'true' for counterclockwise
      ctx.clip();

      // Step 4: Draw the dark overlay only in the clipped region (outside the circle)
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Step 5: Restore the canvas state
      ctx.restore();

      // Step 6: Draw the circle border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
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
    "relative h-32 w-full flex flex-col items-center justify-center border border-dashed border-neutral-900 rounded mb-2";
  fileWrapper.innerHTML =
    "<img src='./icons/cloud_upload_24dp.svg' class='h-8 w-8' /><div class='text-neutral-700 text-s'>Drag & Drop or</div><div class='text-s'>Browse<div/>";

  const fileInput = document.createElement("input");
  fileInput.className = "absolute inset-0 h-full w-full opacity-0";
  fileInput.type = "file";

  fileWrapper.appendChild(fileInput);

  modal.appendChild(fileWrapper);

  const modalContinue = document.createElement("div");
  modalContinue.className =
    "w-full px-2 py-1 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 transition-colors text-neutral-700 rounded cursor-pointer";
  modalContinue.textContent = "Continue";

  modal.appendChild(modalContinue);

  fileInput.addEventListener("change", () => {
    modalContinue.classList.replace("text-neutral-700", "text-white");
  });

  modalContinue.addEventListener("click", () => {
    if (fileInput.files[0] == null) return;
    ImageCropper(fileInput.files[0]);
  });

  parent.appendChild(modal);
}
