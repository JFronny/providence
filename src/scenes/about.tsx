import { TopBar } from "src/components/TopBar";
import { getExampleUrl } from "src/example";
import exampleCode from "src/example.ts?raw";
import typesCode from "src/types.ts?raw";

export function initAboutScreen(root: HTMLElement) {
  root.replaceChildren(
    <div class="page-layout">
      {TopBar()}
      <div class="container">
        <div class="card" style="text-align: left; max-width: 800px; margin: 0 auto;">
          <h1>About Providence</h1>
          <p>
            Providence is a deterministic wheel of fortune app. It uses Bitcoin nonces as seeds to ensure fairness and
            verifiability.
          </p>

          <h2>Example Configuration</h2>
          <p>
            Here is an example of how to configure the wheel programmatically. It produces{" "}
            <a href={getExampleUrl()} target="_blank">
              this URL
            </a>
            .
          </p>
          <pre>{exampleCode}</pre>

          <h2>Types</h2>
          <p>The configuration follows these TypeScript interfaces:</p>
          <pre>{typesCode}</pre>
        </div>
      </div>
    </div>,
  );
}
