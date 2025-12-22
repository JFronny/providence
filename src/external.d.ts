// This is a hack to make the IDE happy about JSX without React
// Also see vite.config.ts, tsconfig.json, and jsx.ts

declare module JSX {
  type Element = HTMLElement | Text;
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
