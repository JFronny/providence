import "./style.css";
import {initHomeScreen} from "src/scenes/home.tsx";
import {initCreateScreen} from "src/scenes/create.tsx";
import {initWheelScreen} from "src/scenes/wheel.tsx";
import {initAboutScreen} from "src/scenes/about.tsx";

// Main entry point for the app
// From here on, we rely purely on JSX-built elements

const container = document.querySelector<HTMLDivElement>('#app')!;
container.innerHTML = "";

const params = new URLSearchParams(window.location.search);

if (params.has("config")) {
  initWheelScreen(container);
} else if (params.get("page") === "create") {
  initCreateScreen(container);
} else if (params.get("page") === "about") {
  initAboutScreen(container);
} else {
  initHomeScreen(container);
}
