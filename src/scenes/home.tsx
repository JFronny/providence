import '../style.css'
import typescriptLogo from '../typescript.svg'
import favicon from 'public/favicon.svg'
import { setupCounter } from '../counter.ts'
import JSX from "src/jsx.ts";

export function initHomeScreen(root: HTMLElement) {
  const counter = <button type="button"></button> as HTMLButtonElement
  root.replaceChildren(
    <div>
      <a href="https://vite.dev" target="_blank">
        <img src={favicon} class="logo" alt="Vite logo" />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank">
        <img src={typescriptLogo} class="logo vanilla" alt="TypeScript logo" />
      </a>
      <h1>Vite + TypeScript</h1>
      <div class="card">
        {counter}
      </div>
      <p class="read-the-docs">
        Click on the Vite and TypeScript logos to learn more
      </p>
    </div>
  )
  setupCounter(counter)
}


