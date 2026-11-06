import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { BridgeShort as IceShort, BRIDGE_FRAMES as ICE_FRAMES } from "./videos/ice/Bridge";
import { TeaspoonShort, TEASPOON_FRAMES } from "./videos/teaspoon/Teaspoon";
import { CantollaShort, CANTOLLA_FRAMES } from "./videos/cantolla/Cantolla";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="IceShort" component={IceShort} durationInFrames={ICE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CantollaShort" component={CantollaShort} durationInFrames={CANTOLLA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="TeaspoonShort" component={TeaspoonShort} durationInFrames={TEASPOON_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
