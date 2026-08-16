/**
 * Framer supplies a module called `framer` at runtime. Nothing outside Framer
 * does, so `next.config.ts`, `tsconfig.json` and `vitest.config.mts` all alias
 * the bare specifier "framer" to this file.
 *
 * The point is that the component files can be pasted into Framer's code panel
 * byte for byte — no import needs rewriting on the way in or out.
 */

export const ControlType = {
  Color: "color",
  Enum: "enum",
  String: "string",
  Number: "number",
  Boolean: "boolean",
} as const;

export type ControlType = (typeof ControlType)[keyof typeof ControlType];

export interface ControlDescription {
  type: ControlType;
  title?: string;
  defaultValue?: unknown;
  options?: readonly string[];
  optionTitles?: readonly string[];
  displaySegmentedControl?: boolean;
  [key: string]: unknown;
}

/**
 * A no-op outside Framer. Framer's editor reads these descriptions to build
 * the design panel; in Next.js the component's own default props stand in,
 * which is why both are generated from the same constants in `tokens.ts`.
 */
export function addPropertyControls(
  _component: unknown,
  _controls: Record<string, ControlDescription>,
): void {}
