import "src/style.css";
import { initAboutScreen } from "src/scenes/about.tsx";
import { initCreateScreen } from "src/scenes/create.tsx";
import { initHomeScreen } from "src/scenes/home.tsx";
import { initWheelScreen } from "src/scenes/wheel.tsx";
import { initDiceScreen } from "src/scenes/dice.tsx";

// Main entry point for the app
// From here on, we rely purely on JSX-built elements

const container = document.querySelector<HTMLDivElement>("#app")!;

function getPageFromUrl(url: URL): string | null {
  if (url.searchParams.has("page")) {
    return url.searchParams.get("page");
  }

  const basePath = import.meta.env.BASE_URL;
  let path = url.pathname;
  if (path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  path = path.replace(/\/$/, "");

  if (path === "") return null;
  return path;
}

let currentAbortController: AbortController | null = null;

function renderPage() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  container.innerHTML = "";
  const url = new URL(window.location.href);

  const page = getPageFromUrl(url);
  if (page === "create") {
    initCreateScreen(container, signal);
  } else if (page === "about") {
    initAboutScreen(container, signal);
  } else if (page === "dice") {
    void initDiceScreen(container, signal);
  } else if (page == "wheel" || (page == null && url.searchParams.has("config"))) {
    void initWheelScreen(container, signal);
  } else {
    initHomeScreen(container, signal);
  }
}

// Handle initial redirect from 404.html (query param to clean URL)
const initialUrl = new URL(window.location.href);
if (initialUrl.searchParams.has("page")) {
  const page = initialUrl.searchParams.get("page")!;
  initialUrl.searchParams.delete("page");

  let basePath = import.meta.env.BASE_URL;
  initialUrl.pathname = basePath + page;

  window.history.replaceState(null, "", initialUrl.toString());
} else if (getPageFromUrl(initialUrl) == null && initialUrl.searchParams.has("config")) {
  initialUrl.pathname = "wheel";
  window.history.replaceState(null, "", initialUrl.toString());
}
console.log(initialUrl);

// Initial render
renderPage();

// Set up router
document.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("a");
  if (target && target.href && target.origin === window.location.origin) {
    if (target.getAttribute("target") === "_blank") return;
    if (target.getAttribute("href")?.startsWith("#")) return;

    e.preventDefault();
    window.history.pushState(null, "", target.href);
    renderPage();
  }
});

window.addEventListener("popstate", () => {
  renderPage();
});
