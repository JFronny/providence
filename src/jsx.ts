// Glue code for JSX without React
// Picked up by the IDE and Vite using their respective configs
// Also see vite.config.ts, tsconfig.json and external.d.ts

export const JSX = {
  createElement: (
    element: string | ((arg0: { children: any[] }) => any),
    props: { [id: string]: any },
    ...children: any[]
  ): HTMLElement => {
    props = props || {};
    if (typeof element === "function") {
      return element({
        ...props,
        children,
      });
    }
    const el: HTMLElement = document.createElement(element);
    for (let k in props) {
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
  },
};
export default JSX;
