import "./style.css";
import {initHomeScreen} from "src/scenes/home.tsx";

// Main entry point for the app
// From here on, we rely purely on JSX-built elements

const container = document.querySelector<HTMLDivElement>('#app')!;
container.innerHTML = "";

initHomeScreen(container)
