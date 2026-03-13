import { createElement, type JSXType } from "src/jsx/index.ts";

export type Fragment = JSX.Element;

type ComponentChild = string | HTMLElement;
type ComponentChildren = ComponentChild[] | ComponentChild;
type Source = { filename: string; lineNumber: number; columnNumber: number };

function flatten(children?: ComponentChildren): ComponentChild[] {
  if (Array.isArray(children)) {
    return children.flatMap(flatten);
  } else if (typeof children === "undefined") {
    return [];
  }
  {
    return [children];
  }
}

export function jsx(
  type: JSXType,
  config: Record<string, any> & { children?: ComponentChildren },
  _key?: string,
  _isStaticChildren?: boolean,
  _source?: Source,
) {
  return createElement(type, config, ...flatten(config.children));
}

export { jsx as jsxs };
