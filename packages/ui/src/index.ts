export * from "./tokens";

// Generate CSS custom properties string for web injection
import { colors, spacing, radius, fontSize } from "./tokens";

export function generateCssVars(): string {
  const entries: string[] = [
    `--bg-cream: ${colors.bgCream}`,
    `--bg-paper: ${colors.bgPaper}`,
    `--bg-stone: ${colors.bgStone}`,
    `--bg-warm: ${colors.bgWarm}`,
    `--accent: ${colors.accent}`,
    `--accent-hover: ${colors.accentHover}`,
    `--accent-mid: ${colors.accentMid}`,
    `--accent-soft: ${colors.accentSoft}`,
    `--accent-mist: ${colors.accentMist}`,
    `--ink: ${colors.ink}`,
    `--ink-2: ${colors.ink2}`,
    `--mute: ${colors.mute}`,
    `--mute-2: ${colors.mute2}`,
    `--line: ${colors.line}`,
    `--line-2: ${colors.line2}`,
    `--success: ${colors.success}`,
    `--success-bg: ${colors.successBg}`,
    `--error: ${colors.error}`,
    `--error-bg: ${colors.errorBg}`,
    `--warning: ${colors.warning}`,
    `--warning-bg: ${colors.warningBg}`,
    `--info: ${colors.info}`,
    `--info-bg: ${colors.infoBg}`,
    `--r-1: ${radius.sm}px`,
    `--r-2: ${radius.md}px`,
    `--r-3: ${radius.xl}px`,
  ];
  return `:root {\n  ${entries.join(";\n  ")};\n}`;
}
