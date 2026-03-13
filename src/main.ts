import "src/style.css";
import { initAboutScreen } from "src/scenes/about.tsx";
import { initCreateScreen } from "src/scenes/create.tsx";
import { initHomeScreen } from "src/scenes/home.tsx";
import { initWheelScreen } from "src/scenes/wheel.tsx";

// Main entry point for the app
// From here on, we rely purely on JSX-built elements

const container = document.querySelector<HTMLDivElement>("#app")!;
container.innerHTML = "";

const params = new URLSearchParams(window.location.search);

if (params.has("config")) {
  void initWheelScreen(container);
} else if (params.get("page") === "create") {
  initCreateScreen(container);
} else if (params.get("page") === "about") {
  initAboutScreen(container);
} else {
  initHomeScreen(container);
}
