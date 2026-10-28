import type { MediaElement } from "@/types/timeline";
import { ClipProperties } from "../editing-controls";
export function MediaProperties({ element }: { element: MediaElement }) {
  return <ClipProperties element={element} />;
}
