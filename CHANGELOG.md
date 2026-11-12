# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-11-12

### Added

- One device, **Tsunami alert**, for the followed region: alert level (0 no
  threat, 1 advisory, 2 watch or international threat message, 3 warning),
  message in effect, earthquake magnitude, place and time, and the estimated
  arrival of the first wave at the forecast point nearest to the home.
- Regions of NOAA's two tsunami warning centers: Alaska, BC and the US West
  Coast; US East and Gulf coasts and eastern Canada; Hawaii; Guam and the
  Northern Mariana Islands; American Samoa; Puerto Rico and the Virgin Islands;
  and the international messages for the Caribbean and the Pacific. Deduced
  from the home, or chosen by hand.
- Scene trigger **Tsunami: new NOAA message**, filtered by kind and region.
- Scene action **Tsunami: read the message in effect**, and the configuration
  action **Show the message in effect**.
- Dashboard widget **Tsunami (NOAA)**.
- Readings every 1, 2 or 5 minutes with `If-Modified-Since`, texts in English,
  French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-tsunami/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-tsunami/releases/tag/v1.0.0
