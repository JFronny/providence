import "../style.css";
import favicon from "/favicon.svg?url";
import JSX from "src/jsx.ts";

export function initHomeScreen(root: HTMLElement) {
  root.replaceChildren(
    <div class="page-layout centered">
      <div class="container">
        <img src={favicon} class="logo" alt="Vite logo" />
        <h1 style="margin: 0.5em">Providence</h1>
        <div class="card">
          <a class="btn" style="margin: 5px;" href="/?page=create">
            Create
          </a>
          <a class="btn" style="margin: 5px;" href="/?page=about">
            About
          </a>
          <a class="btn" style="margin: 5px;" href="https://git.jfronny.dev/Johannes/providence">
            Source
          </a>
        </div>
      </div>
    </div>,
  );
}
