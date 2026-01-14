import type { WheelConfig, WheelOption } from "../../types";
import { mulberry32 } from "../../random";

const PI = Math.PI;
const TAU = 2 * PI;

export interface WheelSector extends WheelOption {
  arc: number;
  startArc: number;
  endArc: number;
}

export class WheelModel {
  config: WheelConfig;
  sectors: WheelSector[];
  winningSector: WheelSector | null = null;
  totalWeight: number;
  respinCount: number = 0;

  angle: number = 0;
  spinSpeed: number = 0.002;
  isSpinning: boolean = false;

  private readonly baseSeed: number;
  private targetAngle: number = 0;
  private startAngle: number = 0;
  private spinStartTime: number | null = null;

  constructor(config: WheelConfig, seed: number) {
    this.config = config;
    this.baseSeed = seed;

    // Normalize options (default id to label)
    this.config.options.forEach((opt) => {
      if (!(opt as any).id) (opt as any).id = opt.label;
    });

    this.totalWeight = config.options.reduce((sum, opt) => sum + opt.weight!, 0);

    let currentArc = 0;
    this.sectors = config.options.map((opt) => {
      const arc = (TAU * opt.weight!) / this.totalWeight;
      const sector = {
        ...opt,
        arc,
        startArc: currentArc,
        endArc: currentArc + arc,
      };
      currentArc += arc;
      return sector;
    });
  }

  spin() {
    if (this.isSpinning) return;

    const seed = this.baseSeed ^ this.respinCount ^ this.sectors.length;
    this.respinCount++;

    // Pick winner
    const rand = mulberry32(seed);
    const r = rand() * this.totalWeight
    let accumulatedWeight = 0;
    let winnerIndex = -1;
    for (let i = 0; i < this.sectors.length; i++) {
      accumulatedWeight += this.sectors[i].weight!;
      if (r <= accumulatedWeight) {
        winnerIndex = i;
        break;
      }
    }

    console.log("Picked winner:", this.config.options[winnerIndex]);

    this.winningSector = this.sectors[winnerIndex];

    const targetRotation = (3 * PI) / 2 - (this.winningSector.startArc + rand() * this.winningSector.arc);

    // Add multiple full rotations
    const extraRotations = 5 + Math.floor(rand() * 5);
    this.targetAngle = targetRotation + extraRotations * TAU;

    this.isSpinning = true;
    this.spinSpeed = 0;
    this.startAngle = this.angle;
    this.spinStartTime = null;
  }

  update(timestamp: number) {
    if (!this.isSpinning) {
      this.angle = (this.angle + this.spinSpeed) % TAU;
      return;
    }

    if (this.spinStartTime === null) this.spinStartTime = timestamp;
    const elapsed = timestamp - this.spinStartTime;
    const duration = 5000; // 5 seconds

    if (elapsed >= duration) {
      this.isSpinning = false;
      this.angle = this.targetAngle % TAU;
      this.spinSpeed = 0.002;
      return true; // Finished spinning
    }

    // Ease out quart
    const t = elapsed / duration;
    const ease = 1 - Math.pow(1 - t, 4);
    this.angle = this.startAngle + (this.targetAngle - this.startAngle) * ease;

    return false;
  }

  getCurrentSector(): WheelSector | null {
    const pointerAngle = (3 * PI) / 2; // 270 degrees
    let effectiveAngle = (pointerAngle - this.angle) % TAU;
    if (effectiveAngle < 0) effectiveAngle += TAU;

    for (const sector of this.sectors) {
      if (effectiveAngle >= sector.startArc && effectiveAngle < sector.endArc) {
        return sector;
      }
    }
    return null;
  }
}
