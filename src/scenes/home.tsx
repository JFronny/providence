import "../style.css";
import favicon from "/favicon.svg?url";
import JSX from "src/jsx.ts";
import { getLatestBlockHash } from "../random.ts";

export function initHomeScreen(root: HTMLElement) {
  root.replaceChildren(
    <div class="page-layout centered">
      <div class="container">
        <a href="https://vite.dev" target="_blank">
          <img src={favicon} class="logo" alt="Vite logo" />
        </a>
        <h1 style="margin: 0.5em">Providence</h1>
        <div class="card">
          <button
            type="button"
            style="margin: 5px;"
            onclick={async (e: PointerEvent) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.disabled = true;
              btn.textContent = "Loading...";
              const hash = await getLatestBlockHash();
              if (hash) {
                window.location.href = `/?page=create&hash=${hash}`;
              } else {
                alert("Failed to fetch block hash. Please try again.");
                btn.disabled = false;
                btn.textContent = "Create Wheel";
              }
            }}
          >
            Create
          </button>
          <a type="button" class="btn" style="margin: 5px;" href="/?page=about">
            About
          </a>
          <a href="https://git.jfronny.dev/Johannes/providence" style="margin: 5px;" class="btn">Source</a>
        </div>
      </div>
    </div>,
  );
}
