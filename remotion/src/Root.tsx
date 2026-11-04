import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { BridgeShort as IceShort, BRIDGE_FRAMES as ICE_FRAMES } from "./videos/ice/Bridge";
import { TeaspoonShort, TEASPOON_FRAMES } from "./videos/teaspoon/Teaspoon";
import { CoxShort, COX_FRAMES } from "./videos/cox/Cox";
import { PitchShort, PITCH_FRAMES } from "./videos/pitch/Pitch";
import { OrganShort, ORGAN_FRAMES } from "./videos/organ/Organ";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="IceShort" component={IceShort} durationInFrames={ICE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CoxShort" component={CoxShort} durationInFrames={COX_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="PitchShort" component={PitchShort} durationInFrames={PITCH_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="OrganShort" component={OrganShort} durationInFrames={ORGAN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="TeaspoonShort" component={TeaspoonShort} durationInFrames={TEASPOON_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
