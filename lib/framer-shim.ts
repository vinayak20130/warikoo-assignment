/**
 * Framer supplies a module called `framer` at runtime. Nothing outside Framer
 * does, so `next.config.ts`, `tsconfig.json` and `vitest.config.mts` all alias
 * the bare specifier "framer" to this file.
 *
 * The point is that the component files can be pasted into Framer's code panel
 * byte for byte — no import needs rewriting on the way in or out.
 *
 * It carries only what the two controls use. Framer's real module types these
 * descriptions properly; a stand-in that half-types them is worse than one
 * that admits it does not.
 */

export const ControlType = {
  Color: "color",
  Number: "number",
} as const;

/** A no-op outside Framer, where the component's default props stand in. */
export function addPropertyControls(
  _component: unknown,
  _controls: Record<string, Record<string, unknown>>,
): void {}
