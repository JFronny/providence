import { type JSXType } from "src/jsx/index.ts";

export type Fragment = JSX.Element;

type ComponentChild = string | HTMLElement;
type ComponentChildren = ComponentChild[] | ComponentChild;
type Source = { filename: string; lineNumber: number; columnNumber: number };

export function jsx(
  type: JSXType,
  config: Record<string, any> & { children?: ComponentChildren },
  _key?: string,
  _isStaticChildren?: boolean,
  _source?: Source,
) {
  if (typeof type === "function") {
    return type(config);
  }
  const el = document.createElement(type);
  for (let k in config) {
    if (k === "children") {
      addChildren(el, config[k]);
    } else if (k.startsWith("on")) {
      if (typeof config[k] !== "function") console.warn(`JSX event handler ${k} is not a function`);
      el.addEventListener(k.slice(2).toLowerCase(), config[k] as any);
    } else {
      el.setAttribute(k, config[k]);
    }
  }
  return el;
}

function addChildren(element: HTMLElement, children?: ComponentChildren) {
  if (Array.isArray(children)) {
    children.forEach((ch) => addChildren(element, ch));
  } else if (typeof children === "undefined") {
    return;
  } else if (typeof children === "string") {
    element.appendChild(document.createTextNode(children));
  } else {
    element.appendChild(children);
  }
}

export { jsx as jsxs };
