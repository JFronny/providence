import favicon from "/favicon.svg?url";

export function TopBar() {
  return (
    <nav class="top-bar">
      <a href={import.meta.env.BASE_URL} class="top-bar-brand">
        <img src={favicon} class="top-bar-logo" alt="Logo" />
        <span>Providence</span>
      </a>
      <div class="top-bar-links">
        <a href={`${import.meta.env.BASE_URL}create`}>Create</a>
        <a href={`${import.meta.env.BASE_URL}about`}>About</a>
        <a href="https://git.jfronny.dev/Johannes/providence">Source</a>
      </div>
    </nav>
  ) as HTMLElement;
}
