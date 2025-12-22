import JSX from "../jsx";
import favicon from "/favicon.svg?url";

export function TopBar() {
  return (
    <nav class="top-bar">
      <a href="/" class="top-bar-brand">
        <img src={favicon} class="top-bar-logo" alt="Logo" />
        <span>Providence</span>
      </a>
      <div class="top-bar-links">
        <a href="/?page=create">Create</a>
        <a href="/?page=about">About</a>
        <a href="https://git.jfronny.dev/Johannes/providence">Source</a>
      </div>
    </nav>
  ) as HTMLElement;
}
