export default function Devider(parent: HTMLElement, text: string) {
  const node = document.createElement("div");
  node.className = "relative h-6 w-full flex items-center justify-center";

  const node_line = document.createElement("div");
  node_line.className = "h-0.25 w-full bg-neutral-800";

  node.appendChild(node_line);

  const node_text = document.createElement("div");
  node_text.className =
    "absolute px-2 bg-neutral-950 text-neutral-400 text-sm font-semibold";
  node_text.textContent = text.toUpperCase();

  node.appendChild(node_text);

  parent.appendChild(node);
}
