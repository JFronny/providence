import { TopBar } from "src/components/TopBar";
import { getExampleUrl } from "src/example";
import exampleCode from "src/example.ts?raw";
import typesCode from "src/types.ts?raw";

export function initAboutScreen(root: HTMLElement, _signal?: AbortSignal) {
  root.replaceChildren(
    <div class="page-layout">
      {TopBar()}
      <div class="container">
        <div class="card" style="text-align: left; max-width: 800px; margin: 0 auto;">
          <h1>About Providence</h1>
          <p>
            Providence is a deterministic wheel of fortune app. It uses public randomness sources as seeds so outcomes
            can be independently verified.
          </p>

          <h2>Group seals</h2>
          <p>
            You can also pick <strong>Group seals</strong> instead of a public beacon. Each phone seals random bits
            locally and only shares a hash first. Once the set of hashes is fixed, everyone opens their secret. The app
            checks the hashes and combines the opens into the wheel seed.
          </p>
          <p>
            One honest participant is enough to keep the result fair. Someone can still refuse to open and force a
            restart with new seals, but they cannot quietly steer the outcome.
          </p>
          <p>
            Pass one link around to collect seals, open when the link comes back, then pass reveals the same way. Share
            the final result URL so everyone can verify and spin the same wheel.
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
