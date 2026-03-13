type Props = Record<string, unknown>;
export type JSXType = string | ((props: Props) => HTMLElement);

type GlobalEventHandlersMapping = {
  [K in keyof GlobalEventHandlersEventMap as `on${Capitalize<K>}`]?: (event: GlobalEventHandlersEventMap[K]) => void;
};

declare global {
  namespace JSX {
    type Element = HTMLElement | Text;
    type IntrinsicElements = {
      [key: string]: Record<string, unknown> & GlobalEventHandlersMapping;
    };
  }
}
