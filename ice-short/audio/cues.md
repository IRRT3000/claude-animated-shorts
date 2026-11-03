# The Ship Made of Ice - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `ice_gen.py` / `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav` (Kokoro am_michael, 24 kHz, resampled to 48 kHz), gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,328,000 samples = 69.333 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-16.0 LUFS**, true peak **-1.2 dBTP**, LRA 2.0 LU, max momentary -9.9 LUFS, max short-term -14.3 LUFS
- Stems: voice -15.8 LUFS, music -26.6 LUFS, sfx -31.6 LUFS (voice gain +5.48 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 5.66 dB, active (>0.1 dB) on 10.01 % of samples, >0.5 dB on 4.08 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -16.0 LUFS
    Threshold: -26.3 LUFS
  Loudness range:
    LRA:         2.0 LU
    Threshold: -36.2 LUFS
    LRA low:   -17.2 LUFS
    LRA high:  -15.2 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| hook (1) | 0.00-4.33 | -16.5 | -26.3 | -39.6 | -26.1 | 9.6 | 9.8 | 5.4 |
| convoy (2) | 4.33-8.00 | -15.7 | -26.8 | -33.9 | -26.0 | 10.3 | 9.2 | 6.2 |
| study (3-4) | 8.00-12.77 | -16.0 | -26.2 | -32.6 | -25.5 | 9.5 | 8.8 | 6.2 |
| bergs (5) | 12.77-14.97 | -16.8 | -26.5 | -40.0 | -26.3 | 9.5 | 9.5 | 5.6 |
| admirals (6) | 14.97-17.27 | -16.4 | -26.2 | -29.2 | -26.3 | 9.9 | 9.4 | 5.8 |
| lab (7) | 17.27-22.37 | -15.7 | -25.8 | -34.3 | -25.5 | 9.8 | 8.6 | 4.7 |
| meeting (8) | 22.37-29.63 | -15.9 | -25.2 | -27.1 | -24.2 | 8.2 | 8.7 | 5.6 |
| shots (9-10) | 29.63-35.53 | -14.4 | - | -24.7 | -24.7 | 10.3 | 19.5 | 8.3 |
| luckily (11-12) | 35.53-40.30 | -15.7 | -26.5 | -45.2 | -26.4 | 10.8 | 11.0 | 6.3 |
| science (13-15) | 40.30-52.30 | -15.8 | -28.3 | -34.2 | -27.9 | 12.1 | 11.5 | 7.8 |
| plan (16) | 52.30-54.70 | -15.6 | -25.1 | -40.5 | -25.0 | 9.4 | 8.1 | 4.2 |
| lake (17-18) | 54.70-61.40 | -15.9 | -26.9 | -32.1 | -26.0 | 10.0 | 10.6 | 4.4 |
| ending (19) | 61.40-69.33 | -15.6 | -27.2 | -40.8 | -27.0 | 11.3 | 12.0 | 8.9 |

## Music map (original naval march, F major, 120 bpm)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): hook -9.5, story -10.5, admirals -10.0, lab -10.0, mb -9.5, luckily -11.0, explain -12.5, plan -9.5, lake -11.0, ending -11.5. Applied section gains (dB): hook -13.4, story -10.6, admirals -10.6, lab -11.7, mb -10.8, luckily -8.7, explain -12.1, plan -12.9, lake -6.6, ending -9.5, dropout -10.8.

Rides (music only, dB): 3.45-3.95 s -3.0, 21.45-22.18 s -4.0, 60.45-60.80 s -2.0 - so quiet sentence-final words stay on top.

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | hook: theme bars 1-2 tutti (fife + glock + tuba/after-beats + snare), roll 3.0-4.3 |
| 4.33 | 130 | F button + clash exactly on the white flash (frame 130) |
| 5.00 | 150 | story: theme bars 1-5, light band (fuller from 9.0 = 'So an inventor...') |
| 15.00 | 450 | admirals: three pompous tuba + horn hits (F-C-F), silence for the crack (16.47), glock 'uh-oh' 16.95 |
| 17.50 | 525 | inventor: music-box theme over bouncing pizzicato eighths and brushes |
| 22.22 | 667 | ta-da: F stab + glock + cymbal right after 'Pykrete.' (21.52-22.16) |
| 22.75 | 682 | Mountbatten's strut: theme bars 1-2, full oom-pah + march snare |
| 26.75 | 802 | C7 pedal + snare roll crescendo, DEAD STOP at 27.84 (first shot 27.93) |
| 27.85 | 836 | silence through BANG 1, the shatter, BANG 2 and the ricochet |
| 35.60 | 1068 | 'Luckily': sneaky staccato pizzicato, vibes peeking |
| 37.75 | 1132 | rising vibes line into 'very interested', Fmaj7 'ooh' chord at 39.85 |
| 40.50 | 1215 | science: curious music-box arpeggios over soft pads, F - Dm - Bb - C7 - F - Dm - C7 |
| 52.40 | 1572 | grand tutti, theme bar 1 + timpani/cymbal for 'two thousand feet long', F stab 54.4 |
| 54.90 | 1647 | lake: soft golden march, theme bars 3-4, light snare |
| 58.90 | 1767 | the band runs down: slower and slower tuba, stops at 60.38 for the stamp (60.4) |
| 60.80 | 1824 | sad 'wah-wah-wah-waah' (muted horn, last note falls) after 'cancelled' |
| 61.80 | 1854 | ending: music box + vibes, theme bars 5-7 over soft pads; triangle tings on 'three' / 'summers' |
| 67.85 | 2035 | last F chord (vibes + pad + music box) after 'lose' (67.53-67.72), fades out by 69.33 |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -15.8 LUFS integrated). Room sounds go to a 0.85 s panelled-room reverb, outdoor sounds to a 1.6 s open-air reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb_sea_hook (bed, integrated) | open Atlantic under the ice carrier: swell, foam, wind, bow wash, gulls (shot 1) | -24 | -24.0 | -39.8 | +0.00 |
| 2 | 4.333 | 130.0 | amb_sea_convoy (bed, integrated) | grey convoy at sea: swell, wind, a far freighter engine throb (shot 2) | -26 | -26.0 | -41.8 | +0.00 |
| 3 | 4.333 | 130.0 | flash_whoosh | reverse air swell into the white flash (frame 130) | -10 | -16.0 | -31.8 | +0.00 |
| 4 | 6.300 | 189.0 | torpedo_boom | a freighter is hit far off: low boom, rumble, water thrown up (splash on 'sinking') | -5 | -11.0 | -26.8 | -0.35 |
| 5 | 7.000 | 210.0 | hull_groan | the hit freighter's steel groaning as it rolls and goes down | -16 | -22.0 | -37.8 | -0.35 |
| 6 | 8.000 | 240.0 | amb_study (bed, integrated) | Pyke's study: quiet room air + slow wall clock (shots 3-4) | -34 | -34.0 | -49.8 | +0.00 |
| 7 | 8.050 | 241.5 | steel_clank | a girder vanishing from the steel heap 1/8 (each one quieter) | -10 | -16.0 | -31.8 | +0.30 |
| 8 | 8.210 | 246.3 | steel_clank | a girder vanishing from the steel heap 2/8 (each one quieter) | -12 | -17.6 | -33.4 | +0.30 |
| 9 | 8.370 | 251.1 | steel_clank | a girder vanishing from the steel heap 3/8 (each one quieter) | -13 | -19.2 | -35.0 | +0.30 |
| 10 | 8.530 | 255.9 | steel_clank | a girder vanishing from the steel heap 4/8 (each one quieter) | -15 | -20.8 | -36.6 | +0.30 |
| 11 | 8.690 | 260.7 | steel_clank | a girder vanishing from the steel heap 5/8 (each one quieter) | -16 | -22.4 | -38.2 | +0.30 |
| 12 | 8.850 | 265.5 | steel_clank | a girder vanishing from the steel heap 6/8 (each one quieter) | -18 | -24.0 | -39.8 | +0.30 |
| 13 | 9.010 | 270.3 | steel_clank | a girder vanishing from the steel heap 7/8 (each one quieter) | -20 | -25.6 | -41.4 | +0.30 |
| 14 | 9.170 | 275.1 | steel_clank | a girder vanishing from the steel heap 8/8 (each one quieter) | -21 | -27.2 | -43.0 | +0.30 |
| 15 | 11.833 | 355.0 | bulb | the idea lightbulb pops on over Pyke: click + bell ding | -8 | -14.0 | -29.8 | +0.00 |
| 16 | 12.567 | 377.0 | amb_bergs (bed, integrated) | icebergs drifting: swell, wind, far ice groans (shot 5) | -25 | -25.0 | -40.8 | +0.00 |
| 17 | 12.767 | 383.0 | whoosh_xfade | cut out to the icebergs | -14 | -20.0 | -35.8 | +0.00 |
| 18 | 14.967 | 449.0 | amb_study (bed, integrated) | Pyke's study: quiet room air + slow wall clock (shots 6-7) | -34 | -34.0 | -49.8 | +0.00 |
| 19 | 16.467 | 494.0 | desk_crack | the test ice block on the side table cracks on 'cracks' | -5 | -11.0 | -26.8 | +0.20 |
| 20 | 18.583 | 557.5 | sawdust | Pyke tips sawdust into the tub of water | -14 | -20.0 | -35.8 | -0.20 |
| 21 | 18.800 | 564.0 | freezer | freezer door: latch, seal pop, hinge, cold air rushing out | -10 | -16.0 | -31.8 | +0.35 |
| 22 | 19.000 | 570.0 | cold_mist | frosty mist curling out of the freezer | -20 | -26.0 | -41.8 | +0.35 |
| 23 | 22.183 | 665.5 | knock | two knocks on the finished pykrete block: hard, solid (after the word) | -10 | -16.0 | -31.8 | +0.00 |
| 24 | 22.367 | 671.0 | amb_room (bed, integrated) | the generals' meeting room: bigger room air, lamp hum (shots 8-12) | -36 | -36.0 | -51.8 | +0.00 |
| 25 | 22.367 | 671.0 | murmur | the generals talking among themselves until Mountbatten walks in (fades by 24.3 s) | -18 | -24.0 | -39.8 | +0.00 |
| 26 | 22.867 | 686.0 | door | Mountbatten opens the heavy meeting-room door | -12 | -18.0 | -33.8 | +0.15 |
| 27 | 23.067 | 692.0 | steps | Mountbatten's footsteps on the boards 1/5 | -15 | -21.0 | -36.8 | +0.10 |
| 28 | 23.427 | 702.8 | steps | Mountbatten's footsteps on the boards 2/5 | -16 | -22.0 | -37.8 | +0.10 |
| 29 | 23.787 | 713.6 | steps | Mountbatten's footsteps on the boards 3/5 | -16 | -22.0 | -37.8 | +0.10 |
| 30 | 24.147 | 724.4 | steps | Mountbatten's footsteps on the boards 4/5 | -16 | -22.0 | -37.8 | +0.10 |
| 31 | 24.507 | 735.2 | steps | Mountbatten's footsteps on the boards 5/5 | -16 | -22.0 | -37.8 | +0.10 |
| 32 | 27.483 | 824.5 | draw | pistol out of the holster: leather + hammer cock click | -14 | -20.0 | -35.8 | +0.10 |
| 33 | 27.933 | 838.0 | gunshot1 | BANG 1: pistol fired at the ice block (indoor crack + room tail) | +1 | -5.0 | -20.8 | +0.05 |
| 34 | 29.767 | 893.0 | shatter | the pure ice block bursts: crack, thump, a shower of shards tinkling down | -1 | -7.0 | -22.8 | +0.00 |
| 35 | 31.400 | 942.0 | gunshot2 | BANG 2: pistol fired at the pykrete block | +1 | -5.0 | -20.8 | +0.05 |
| 36 | 33.100 | 993.0 | ricochet | the bullet hits the pykrete and comes straight back: thwack + falling whine | -2 | -8.0 | -23.8 | -0.20 |
| 37 | 33.140 | 994.2 | gasps | the generals duck: a ripple of gasps | -12 | -18.0 | -33.8 | +0.00 |
| 38 | 33.567 | 1007.0 | wall_thud | the bullet buries itself in the panelling behind them + plaster dust | -10 | -16.0 | -31.8 | +0.40 |
| 39 | 35.400 | 1062.0 | rustle | generals bob back up over the table (chairs) | -18 | -24.0 | -39.8 | +0.00 |
| 40 | 38.533 | 1156.0 | chairs | chairs creak as the generals lean in, very interested | -16 | -22.0 | -37.8 | +0.00 |
| 41 | 40.050 | 1201.5 | amb_insert (bed, integrated) | the demo bench: very quiet room air (shots 13-15) | -40 | -40.0 | -55.8 | +0.00 |
| 42 | 42.133 | 1264.0 | crack_ice | one tiny crack runs straight through the clear ice block, ends in a dry split | -6 | -12.0 | -27.8 | +0.00 |
| 43 | 45.767 | 1373.0 | crack_mud | a crack starts in the mud brick and stops dead at the straw | -9 | -15.0 | -30.8 | +0.00 |
| 44 | 49.300 | 1479.0 | crack_pyk | a crack in the pykrete stops at the sawdust after a few ticks: dull tock | -9 | -15.0 | -30.8 | +0.00 |
| 45 | 50.767 | 1523.0 | cold_hiss | cold mist staying in the pykrete block | -20 | -26.0 | -41.8 | +0.00 |
| 46 | 52.050 | 1561.5 | amb_high_wind (bed, integrated) | aerial over the planned 2000 ft ship: high wind, far sea (shot 16) | -26 | -26.0 | -41.8 | +0.00 |
| 47 | 52.300 | 1569.0 | whoosh_xfade | crossfade up to the aerial | -14 | -20.0 | -35.8 | +0.00 |
| 48 | 54.450 | 1633.5 | amb_lake (bed, integrated) | Canadian mountain lake, golden hour: lapping, breeze, birds; crickets towards the end (shots 17-19) | -29 | -29.0 | -44.8 | +0.00 |
| 49 | 54.700 | 1641.0 | whoosh_xfade | crossfade to the lake | -14 | -20.0 | -35.8 | +0.00 |
| 50 | 55.000 | 1650.0 | hammer | crew hammering on the test hull, across the water 1/4 | -20 | -26.0 | -41.8 | +0.25 |
| 51 | 55.550 | 1666.5 | hammer | crew hammering on the test hull, across the water 2/4 | -20 | -26.0 | -41.8 | +0.25 |
| 52 | 56.100 | 1683.0 | hammer | crew hammering on the test hull, across the water 3/4 | -20 | -26.0 | -41.8 | +0.25 |
| 53 | 56.650 | 1699.5 | hammer | crew hammering on the test hull, across the water 4/4 | -20 | -26.0 | -41.8 | +0.25 |
| 54 | 56.933 | 1708.0 | flyby | four propeller planes pass over the lake, left to right (planes got better) | -9 | -15.0 | -30.8 | +0.00 |
| 55 | 58.600 | 1758.0 | oar | the crew rowing away: oar stroke 1/4 | -18 | -24.0 | -39.8 | -0.30 |
| 56 | 59.650 | 1789.5 | oar | the crew rowing away: oar stroke 2/4 | -20 | -25.5 | -41.3 | -0.30 |
| 57 | 60.400 | 1812.0 | stamp | CANCELLED: the rubber stamp slams onto the blueprint | -1 | -7.0 | -22.8 | +0.00 |
| 58 | 60.700 | 1821.0 | oar | the crew rowing away: oar stroke 3/4 | -21 | -27.0 | -42.8 | -0.30 |
| 59 | 61.750 | 1852.5 | oar | the crew rowing away: oar stroke 4/4 | -22 | -28.5 | -44.3 | -0.30 |
| 60 | 64.700 | 1941.0 | melt (bed, integrated) | the hull melting: water trickling and dripping into the lake | -30 | -30.0 | -45.8 | +0.00 |
| 61 | 66.100 | 1983.0 | season | a summer goes by in a blink: airy whoosh 1/2 | -16 | -22.0 | -37.8 | +0.00 |
| 62 | 66.667 | 2000.0 | season | a summer goes by in a blink: airy whoosh 2/2 | -16 | -22.0 | -37.8 | +0.00 |
| 63 | 67.867 | 2036.0 | bloop | the last of the ship slips under: one soft 'bloop' (after 'lose') | -12 | -18.0 | -33.8 | +0.00 |
