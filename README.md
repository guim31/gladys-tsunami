# Tsunami Alerts (NOAA) for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) external integration that
brings the official tsunami messages of NOAA's two tsunami warning centers into
Gladys, for the coast of your home:

- the **National Tsunami Warning Center** (NTWC, Palmer, Alaska): Alaska,
  British Columbia, the US West, East and Gulf coasts, eastern Canada;
- the **Pacific Tsunami Warning Center** (PTWC, Honolulu): Hawaii, Guam and the
  Northern Mariana Islands, American Samoa, Puerto Rico and the Virgin Islands,
  and the international threat messages for the Pacific and the Caribbean.

One device gives the level in effect (0 no threat, 1 advisory, 2 watch or
international threat message, 3 warning), the kind of message, the earthquake
(magnitude, place, time) and the estimated arrival time of the first wave at the
forecast point nearest to your home when the bulletin lists one. A scene trigger
fires on every new bulletin of your region, a scene action reads the message in
effect as one sentence, and a dashboard widget shows it all.

> **Not an official alert service.** It does not replace tsunami sirens,
> Wireless Emergency Alerts, NOAA Weather Radio or the instructions of your
> local authorities. Not affiliated with NOAA.

User documentation: [English](docs/en.md) · [Français](docs/fr.md) ·
[Deutsch](docs/de.md) · [Español](docs/es.md).

## Requirements

- Gladys Assistant 5.1 or later, with Internet access to `www.tsunami.gov`.
- The location of your house in Gladys, coordinates in the configuration, or a
  region chosen by hand.

## Installation

In Gladys: **Integrations → Install from GitHub**, with the address of this
repository, `https://github.com/guim31/gladys-tsunami`. Save the configuration,
then create the **Tsunami alert** device in the **Discover** tab.

## How it works

Every minute (1, 2 or 5), the container reads `previous.js` (the 40 latest
bulletins of both centers, one row per WMO product) and the two Atom feeds of
tsunami.gov with `If-Modified-Since`: they answer `304 Not Modified` while
nothing is issued. The WMO heading of each bulletin says which coast it is
written for (`WEAK5x` Alaska and West Coast, `WEXX` East and Gulf coasts,
`WEHW` Hawaii, `WEGM` Guam, `WEZS` American Samoa, `WECA41/42` Puerto Rico,
`WECA43` Caribbean, `WEPA` Pacific). For each new bulletin of the followed
region, its CAP document and text bulletin are read once to know what it is and
when it expires. Nothing is sent anywhere: your location stays in Gladys.

## Limits

- The region is a whole coast, not your exact forecast zone.
- Arrival times are read only from the tables with coordinates of the
  international threat messages.
- Tested against the real bulletins of tsunami.gov (Panama earthquake of
  9 October 2026, statements of November 2026). No real US warning was issued
  during development: the warning, watch, advisory and cancellation cases are
  derived from a real statement. Feedback welcome.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests replay the documents recorded from tsunami.gov in
`test/fixtures/tsunami/` against the SDK's fake Gladys; they never touch the
network.

## Credits

- Data: NOAA / National Weather Service, National and Pacific Tsunami Warning
  Centers, [tsunami.gov](https://www.tsunami.gov) (public domain).
- Built on the official
  [integration template](https://github.com/GladysAssistant/integration-template-js)
  and [SDK](https://github.com/GladysAssistant/integration-sdk-js) of Gladys
  Assistant.

This project is not affiliated with, endorsed by or connected to NOAA or the
National Weather Service.

## License

[Apache-2.0](LICENSE)
