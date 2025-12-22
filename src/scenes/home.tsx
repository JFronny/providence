import '../style.css'
import favicon from '/favicon.svg?url'
import JSX from "src/jsx.ts";
import { getLatestBlockHash } from "../random.ts";

export function initHomeScreen(root: HTMLElement) {
  root.replaceChildren(
    <div>
      <a href="https://vite.dev" target="_blank">
        <img src={favicon} class="logo" alt="Vite logo" />
      </a>
      <h1>Providence</h1>
      <div class="card">
        <div style="margin-top: 1em;">
          <button type="button"
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
          <a type="button" class="btn" style="margin-left: 10px;" href="/?page=about">About</a>
        </div>
      </div>
    </div>
  )
}
