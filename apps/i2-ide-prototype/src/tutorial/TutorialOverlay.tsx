import React from "react";
import { useTutorial } from "./TutorialContext.tsx";
import { TutorialJennyScreen } from "./TutorialJennyScreen.tsx";

export function TutorialOverlay() {
  const { isJennyOpen, closeJenny, onJennyCompletedCallback } = useTutorial();

  if (!isJennyOpen) return null;

  const handleComplete = () => {
    closeJenny();
    onJennyCompletedCallback?.();
  };

  return (
    <TutorialJennyScreen
      onComplete={handleComplete}
      onClose={closeJenny}
    />
  );
}
