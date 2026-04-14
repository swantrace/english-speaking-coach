import { cn } from "@english-coach/ui";
import { RoomAudioRenderer, RoomContext, StartAudio } from "@livekit/components-react";
import type { Room } from "livekit-client";
import { createElement, Fragment, type PropsWithChildren } from "react";

interface SessionLiveKitProviderProps extends PropsWithChildren {
  room: Room | null;
}

export function SessionLiveKitProvider({ children, room }: SessionLiveKitProviderProps) {
  if (!room) {
    return createElement(Fragment, null, children);
  }

  return createElement(RoomContext.Provider, { value: room }, createElement(RoomAudioRenderer, { room }), children);
}

export function SessionStartAudioButton({ className }: { className?: string }) {
  return createElement(StartAudio, {
    className: cn(buttonClassName, className),
    label: "Enable coach audio",
  });
}

const buttonClassName = cn(
  "inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:border-stone-400 hover:bg-stone-50",
);
