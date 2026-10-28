"use client";

import { TabBar } from "./tabbar";
import { MediaView } from "./views/media";
import { useMediaPanelStore, Tab } from "./store";
import { TextView } from "./views/text";
import { AudioView } from "./views/audio";
import { Separator } from "@/components/ui/separator";
import { SettingsView } from "./views/settings";
import { AiChatView } from "./views/ai-chat";

import {
  EditingPanel,
  CaptionsPanel,
  StickersPanel,
} from "../editing-controls";

export function MediaPanel() {
  const { activeTab } = useMediaPanelStore();

  const viewMap: Record<Tab, React.ReactNode> = {
    media: <MediaView />,
    audio: <AudioView />,
    text: <TextView />,
    stickers: <StickersPanel />,
    effects: <EditingPanel mode="effects" />,
    transitions: <EditingPanel mode="transitions" />,
    captions: <CaptionsPanel />,
    filters: <EditingPanel mode="filters" />,
    adjustment: <EditingPanel mode="adjustment" />,
    settings: <SettingsView />,
    "ai-chat": <AiChatView />,
  };

  return (
    <div className="h-full flex bg-panel">
      <TabBar />
      <Separator orientation="vertical" />
      <div className="flex-1 overflow-y-auto">{viewMap[activeTab]}</div>
    </div>
  );
}
