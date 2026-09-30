# Flights Near Home

Live flights over your house, on one page. Next.js 16 + TypeScript, live aircraft from [adsb.lol](https://adsb.lol) (free, no key, ODbL).

## Run it

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev                  # http://localhost:3000
```

### `.env.local`
| Variable | Needed? | What it's for |
| --- | --- | --- |
| `NOMINATIM_USER_AGENT` | Yes | Put your app name + email; required by OpenStreetMap's geocoder. |
| `NEXT_PUBLIC_HOME_ADDRESS`, `_LAT`, `_LON` | Optional | Starting location before you edit the address in the app. |
| `NEXT_PUBLIC_RADIUS_MI` | Optional | Search radius (default 15). |

## Using it with Claude Code

Unzip, `cd` into the folder, run `claude`. `CLAUDE.md` gives Claude Code the architecture, design rules and API limits, so you can ask for changes directly. A good first prompt:

> Read CLAUDE.md, run `npm install` and `npm run build`, then start the dev server and confirm `/api/flights?lat=34.05&lon=-118.24` returns aircraft. Fix anything that fails.

Ideas for next steps to ask for:
- Smooth plane movement between updates (dead-reckon from heading + speed).
- Real map tiles under the radar (e.g. MapLibre with a dark style) keeping the ring/plane overlay.
- A mobile layout pass (the grid already stacks under 1100px).
- Filters (hide small/private aircraft, altitude range).

## Notes
- Live ADS-B positions have no origin/destination, so routes come from [adsbdb](https://www.adsbdb.com). Some flights (private, cargo, new routes) will show "—".
- Why not OpenSky: it blocks requests from cloud/hosting IPs (Vercel, AWS…), so it only works when run locally.
- Everything external is called from the server routes in `app/api/`, so keys never reach the browser.
