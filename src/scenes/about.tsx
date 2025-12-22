import JSX from "../jsx";
import { TopBar } from "../components/TopBar";
import exampleCode from "../example.ts?raw";
import typesCode from "../types.ts?raw";
import { getExampleUrl } from "../example";

export function initAboutScreen(root: HTMLElement) {
  root.replaceChildren(
    <div>
      {TopBar()}
      <div class="card" style="text-align: left; max-width: 800px; margin: 0 auto;">
        <h1>About Providence</h1>
        <p>
          Providence is a deterministic wheel of fortune app.
          It uses Bitcoin nonces as seeds to ensure fairness and verifiability.
        </p>

        <h2>Example Configuration</h2>
        <p>
          Here is an example of how to configure the wheel programmatically.
          It produces <a href={getExampleUrl()} target="_blank">this URL</a>.
        </p>
        <pre>{exampleCode}</pre>

        <h2>Types</h2>
        <p>The configuration follows these TypeScript interfaces:</p>
        <pre>{typesCode}</pre>
      </div>
    </div>
  );
}

