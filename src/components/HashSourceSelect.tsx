import type { HashSource } from "src/types.ts";

export class HashSourceSelect {
  select: HTMLSelectElement;
  element: JSX.Element;

  constructor() {
    this.select = (
      <select class="form-input">
        <option value="Bitcoin">Bitcoin</option>
        <option value="Monero">Monero</option>
      </select>
    ) as HTMLSelectElement;
    this.element = (
      <div class="form-group">
        <label class="form-label">Hash Source:</label>
        {this.select}
      </div>
    );
  }

  get value() {
    return this.select.value as HashSource;
  }
}
