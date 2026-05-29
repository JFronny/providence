/**
 * A wheel option/sector
 * @prop id unique identifier to be passed to the action template, defaults to the label
 * @prop label option label for display
 * @prop weight weight of the option, defaults to 1
 * @prop color color of the option, defaults to a random color
 */
export interface WheelOption {
  id?: string;
  label: string;
  weight?: number;
  color?: string;
}

/**
 * A wheel action.
 * After a result is determined, all actions will be shown to the user as links they can click
 * @prop name name of the action
 * @prop template template string to be used for the action,
 *                can contain {label} to be replaced with the option label,
 *                and {id} to be replaced with the option id
 */
export interface WheelAction {
  name: string;
  template: string;
}

/**
 * The source of the hash to be used for the wheel
 * If not provided, the default is {@link DefaultHashSource}
 */
export type HashSource = "Bitcoin" | "Monero";
export const DefaultHashSource: HashSource = "Bitcoin";

/**
 * A reference to a hash.
 * @prop type type of hash reference, can be "historic", "current", or "next"
 *            If "historic", the hash is provided as part of the reference.
 *            If "current", the current hash is fetched from the blockchain.
 *            If "next", wait until a new block is mined and use the hash from that block.
 * @prop hash hash value, either a hex string or a base64 string
 * @prop source source of the hash, defaults to {@link DefaultHashSource}
 */
export type HashRef =
  | { type: "historic"; hash: string; source?: HashSource }
  | { type: "current"; source?: HashSource }
  | { type: "next"; source?: HashSource };

/**
 * A complete wheel configuration.
 * This combines all the information needed to create a wheel.
 * @prop hash hash source
 * @prop options list of wheel options
 * @prop actions list of wheel actions
 */
export interface WheelConfig {
  hash: HashRef;
  options: WheelOption[];
  actions: WheelAction[];
}
