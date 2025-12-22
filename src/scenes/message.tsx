import JSX from "src/jsx.ts";
import { TopBar } from "src/components/TopBar.tsx";

export function message(root: HTMLElement, message: string) {
  root.replaceChildren(
    <div class="page-layout centered">
      {TopBar()}
      <div class="container">
        <div class="card">
          <h1>{message}</h1>
        </div>
      </div>
    </div>,
  );
}
