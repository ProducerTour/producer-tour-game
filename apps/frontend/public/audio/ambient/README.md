# Ambient Audio System

This directory contains biome-based ambient audio for the game world.

## Directory Structure

```
ambient/
├── zones/           # Biome ambient loops (16 files)
│   ├── ocean_day.mp3
│   ├── ocean_night.mp3
│   ├── beach_day.mp3
│   ├── beach_night.mp3
│   ├── wetland_day.mp3
│   ├── wetland_night.mp3
│   ├── grassland_day.mp3
│   ├── grassland_night.mp3
│   ├── forest_day.mp3
│   ├── forest_night.mp3
│   ├── dry_day.mp3
│   ├── dry_night.mp3
│   ├── mountain_day.mp3
│   ├── mountain_night.mp3
│   ├── snow_day.mp3
│   └── snow_night.mp3
├── weather/         # Weather overlay loops (4 files)
│   ├── rain_light.mp3
│   ├── rain_heavy.mp3
│   ├── wind_strong.mp3
│   └── storm.mp3
└── README.md
```

## Audio Specifications

- **Format**: MP3 (128-192 kbps) or OGG
- **Duration**: 60-120 seconds (seamless loop)
- **Channels**: Stereo
- **Sample Rate**: 44.1 kHz

## Zone Descriptions

| Zone | Day Sounds | Night Sounds |
|------|------------|--------------|
| **ocean** | Underwater ambience, muffled waves | Deep, eerie underwater |
| **beach** | Waves crashing, seagulls calling | Gentle waves, soft wind |
| **wetland** | Frogs, insects, water splashes | Crickets, owls, distant splashes |
| **grassland** | Wind through grass, birdsong | Crickets, distant howls |
| **forest** | Birds, rustling leaves, woodland creatures | Owls, nocturnal insects, wind |
| **dry** | Hot wind, heat shimmer, rattlesnake | Cold wind, coyotes |
| **mountain** | Wind gusts, eagles, echoes | Strong wind, silence |
| **snow** | Howling wind, ice creaking | Blizzard, distant wolves |

## Weather Overlays

| Weather | Sound | Volume |
|---------|-------|--------|
| **rain_light** | Gentle rain pattering | 30% |
| **rain_heavy** | Downpour, thunder | 60% |
| **wind** | Gusty wind | 40% |
| **storm** | Thunder, lightning, heavy rain | 80% |

## Biome Mapping

16 game biomes are grouped into 8 ambient zones:

- **ocean**: deep_ocean, shallow_ocean
- **beach**: beach
- **wetland**: marsh, swamp
- **grassland**: grassland, meadow, savanna
- **forest**: temperate_forest, boreal_forest, rainforest
- **dry**: desert, scrubland
- **mountain**: alpine_meadow, rocky_mountain
- **snow**: snow_peak, glacier

## Free Audio Resources

- [freesound.org](https://freesound.org) - CC-licensed sound effects
- [zapsplat.com](https://zapsplat.com) - Free SFX library
- [soundbible.com](http://soundbible.com) - Public domain sounds
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk) - 16,000 free sounds
