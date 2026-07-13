import "src/style.css";
import favicon from "/favicon.svg?url";

export function initHomeScreen(root: HTMLElement, _signal?: AbortSignal) {
  root.replaceChildren(
    <div class="page-layout centered">
      <div class="container">
        <img src={favicon} class="logo" alt="Vite logo" />
        <h1 style="margin: 0.5em">Providence</h1>
        <div class="card">
          <a class="btn" style="margin: 5px;" href={`${import.meta.env.BASE_URL}create`}>
            Create
          </a>
          <a class="btn" style="margin: 5px;" href={`${import.meta.env.BASE_URL}dice`}>
            Dice
          </a>
          <a class="btn" style="margin: 5px;" href={`${import.meta.env.BASE_URL}about`}>
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
