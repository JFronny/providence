import JSX from "../../jsx";
import { WheelModel, type WheelSector } from "./model";
import { TopBar } from "../../components/TopBar";
import type { WheelAction } from "src/types.ts";

export class WheelView {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  spinButton: HTMLButtonElement;
  dialog: HTMLDialogElement;
  audioCtx: AudioContext;
  respinCount: HTMLDivElement;

  constructor(root: HTMLElement, blockHash: string) {
    // Setup UI
    this.canvas = (<canvas width="500" height="500" class="wheel-canvas"></canvas>) as HTMLCanvasElement;
    this.spinButton = (<button class="spin-button">SPIN</button>) as HTMLButtonElement;
    this.dialog = (<dialog class="result-dialog"></dialog>) as HTMLDialogElement;
    this.respinCount = (<div class="respin-count" />) as HTMLDivElement;

    const wheelWrapper = (
      <div class="wheel-wrapper">
        {this.canvas}
        <div class="wheel-pointer"></div>
      </div>
    ) as HTMLDivElement;

    root.replaceChildren(
      <div class="page-layout centered">
        {TopBar()}
        <div class="container">
          <div class="wheel-container">
            {wheelWrapper}
            {this.spinButton}
            <div class="block-hash">Block Hash: {blockHash}</div>
            {this.respinCount}
            {this.dialog}
          </div>
        </div>
      </div>,
    );

    this.ctx = this.canvas.getContext("2d")!;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  bind(doSpin: () => void) {
    this.spinButton.addEventListener("click", doSpin);
    this.canvas.addEventListener("click", doSpin);
  }

  playTick() {
    if (this.audioCtx.state === "suspended") this.audioCtx.resume();
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  draw(model: WheelModel) {
    const dia = this.canvas.width;
    const rad = dia / 2;

    this.ctx.clearRect(0, 0, dia, dia);
    this.ctx.save();
    this.ctx.translate(rad, rad);
    this.ctx.rotate(model.angle);
    this.ctx.translate(-rad, -rad);

    model.sectors.forEach((sector) => {
      this.drawSector(sector, rad);
    });

    this.ctx.restore();

    this.respinCount.textContent = `Spins: ${model.respinCount}`;
  }

  private drawSector(sector: WheelSector, rad: number) {
    const color = sector.color!;
    this.ctx.save();
    this.ctx.beginPath();
    const gradient = this.ctx.createLinearGradient(0, 0, rad, rad);
    gradient.addColorStop(0, color);
    // Currently, this doesn't support specifying the color space in which the gradient is computed, which would make this rather ugly
    // gradient.addColorStop(1, `oklch(from ${color} l c calc(h + 180)`)
    this.ctx.fillStyle = gradient;
    this.ctx.moveTo(rad, rad);
    this.ctx.arc(rad, rad, rad, sector.startArc, sector.endArc);
    this.ctx.lineTo(rad, rad);
    this.ctx.fill();

    // Text
    this.ctx.translate(rad, rad);
    this.ctx.rotate(sector.startArc + sector.arc / 2);
    this.ctx.textAlign = "right";
    const darkened = `(l - 0.4)`;
    const lightened = `(l + 0.5)`;
    const boundary = `(l - 0.4)/max(abs(l - 0.4), 0.0000001)`; // prevent divide by zero
    const clampedBoundary = `clamp(${boundary}, 0, 1)`; // either 1 (if l > 0.4) or 0 (if l <= 0.4)
    const resultingLightness = `calc(${darkened} * ${clampedBoundary} + ${lightened} * (1 - ${clampedBoundary}))`;
    this.ctx.fillStyle = `oklch(from ${color} ${resultingLightness} c h)`;
    this.ctx.font = "bold 24px sans-serif";
    const lineHeight = 26;
    const lines = this.breakLabel(sector.label, rad);
    const startY = 10 - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], rad - 10, startY + i * lineHeight);
    }
    this.ctx.restore();
  }

  private breakLabel(label: string, rad: number): string[] {
    const maxWidth = rad - 30;
    const words = label.split(/\s+/);
    let lines: string[] = [];
    let current = words[0] || "";
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      const test = current + " " + w;
      if (this.ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        lines.push(current);
        current = w;
        if (lines.length >= 3) {
          lines[lines.length - 1] += "…";
          break;
        }
      }
    }
    if (current && lines.length <= 2) lines.push(current);

    // If a single line and still too long (long word), ellipsize
    if (lines.length === 1 && this.ctx.measureText(lines[0]).width > maxWidth) {
      const ell = "…";
      let text = lines[0];
      while (text.length > 0 && this.ctx.measureText(text + ell).width > maxWidth) {
        text = text.slice(0, -1);
      }
      lines[0] = text + ell;
    }

    return lines;
  }

  showResult(winner: WheelSector, removedUrl: string | null, actions: WheelAction[], onClose: () => void) {
    const sanitizedLabel = winner.label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const id = winner.id || winner.label;

    const actionLinks = actions.map((action) => {
      let url = action.template;
      url = url.replace(/{id}/g, encodeURIComponent(id));
      url = url.replace(/{label}/g, encodeURIComponent(winner.label));
      url = url.replace(/{}/g, encodeURIComponent(id));

      // Basic sanitization of URL to prevent javascript:
      if (url.toLowerCase().startsWith("javascript:")) return "";
      return (
        <a href={url} target="_blank" class="btn">
          {action.name}
        </a>
      );
    });

    if (removedUrl != null) {
      actionLinks.push(
        <a class="btn" href={removedUrl}>
          Remove
        </a>,
      );
    }

    actionLinks.push(
      <button
        onclick={() => {
          if (wasClosed) return;
          wasClosed = true;
          this.dialog.close();
          onClose();
        }}
      >
        Close
      </button>,
    );

    let wasClosed = false;
    this.dialog.replaceChildren(
      <div>
        <h2>Result: {sanitizedLabel}</h2>
        {...actionLinks}
      </div>,
    );

    this.dialog.showModal();
  }
}
