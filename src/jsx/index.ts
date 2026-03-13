type Props = Record<string, unknown>;
export type JSXType = string | ((props: Props) => HTMLElement);

type GlobalEventHandlersMapping = {
  [K in keyof GlobalEventHandlersEventMap as `on${Capitalize<K>}`]?: (event: GlobalEventHandlersEventMap[K]) => void;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = HTMLElement | Text;
    type IntrinsicElements = {
      [key: string]: Record<string, unknown> & GlobalEventHandlersMapping;
    };
  }
}

export function createElement(type: JSXType, props: { [id: string]: any }, ...children: any[]): HTMLElement {
  props = props || {};
  if (typeof type === "function") {
    return type({
      ...props,
      children,
    });
  }
  const el: HTMLElement = document.createElement(type);
  for (let k in props) {
    if (k === "__self" || k === "__source") continue;
    if (k.startsWith("on")) {
      if (typeof props[k] !== "function") console.warn(`JSX event handler ${k} is not a function`);
      el.addEventListener(k.slice(2).toLowerCase(), props[k] as any);
    } else el.setAttribute(k, props[k]);
  }
  for (let child of children) {
    if (typeof child === "string") child = document.createTextNode(child);
    el.appendChild(child);
  }
  return el;
}
