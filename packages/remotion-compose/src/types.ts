export type CaptionCue = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

export type OverlayKind =
  | "title_card"
  | "lower_third"
  | "callout"
  | "badge"
  | "cta"
  | "stat";

export type OverlayPosition =
  | "top_left"
  | "top_right"
  | "lower_left"
  | "lower_right"
  | "center"
  | "bottom_center";

export type OverlayCue = {
  id?: string;
  type: OverlayKind;
  text: string;
  startSeconds: number;
  endSeconds: number;
  position?: OverlayPosition;
  eyebrow?: string;
  value?: string;
  accentColor?: string;
};

export type BrandConfig = {
  name?: string;
  logoSrc?: string;
  accentColor?: string;
};

export type ComposeTheme = {
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  accentColor?: string;
  captionBackground?: string;
};

/** Values use fractions of the original source, before camera motion. */
export type PresentationCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PresentationCamera = {
  scale_from: number;
  scale_to: number;
  focus_x_from: number;
  focus_x_to: number;
  focus_y_from: number;
  focus_y_to: number;
  rotate_x_from: number;
  rotate_x_to: number;
  rotate_y_from: number;
  rotate_y_to: number;
  translate_x_from: number;
  translate_x_to: number;
  translate_y_from: number;
  translate_y_to: number;
};

type PresentationSceneBase = {
  id: string;
  start_seconds: number;
  end_seconds: number;
  background: string;
  color_scheme: "dark" | "light";
  transition_out: "cut" | "fade";
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
};

export type PresentationTitleScene = PresentationSceneBase & { kind: "title" };
export type PresentationScreenScene = PresentationSceneBase & {
  kind: "screen";
  source_start_seconds: number;
  playback_rate: number;
  layout: "full" | "window";
  crop: PresentationCrop;
  camera: PresentationCamera;
};

export type ProductPresentation = {
  version: 1;
  muted: boolean;
  /** Staged by the MCP wrapper; source paths never become network URLs. */
  soundtrack_src?: string;
  soundtrack_volume?: number;
  soundtrack_start_seconds?: number;
  soundtrack_fade_seconds?: number;
  scenes: (PresentationTitleScene | PresentationScreenScene)[];
};

export type UniVAComposeProps = {
  videoSrc: string;
  title?: string;
  subtitle?: string;
  durationSeconds?: number;
  captions?: CaptionCue[];
  overlays?: OverlayCue[];
  brand?: BrandConfig;
  theme?: ComposeTheme;
  showProgress?: boolean;
  fit?: "cover" | "contain";
  presentation?: ProductPresentation;
  sourceDimensions?: { width: number; height: number };
};
