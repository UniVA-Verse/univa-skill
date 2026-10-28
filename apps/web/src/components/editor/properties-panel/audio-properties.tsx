import type { MediaElement } from "@/types/timeline";
import { ClipProperties } from "../editing-controls";
export function AudioProperties({ element }: { element: MediaElement }) {
  return <ClipProperties element={element} audioOnly />;
}
