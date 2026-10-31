# Portfolio World

An interactive 3D portfolio. Instead of scrolling through a list, you walk a
small fox around a low-poly island and visit a station for each project. Step
up to a station and press <kbd>E</kbd>. A panel opens with what the project
does, the tech behind it, a link to the code and, where possible, a live demo
you can try right there.

**Live:** [andrija-slovic-portfolio.vercel.app](https://andrija-slovic-portfolio.vercel.app/)

## Highlights

- **A world you walk through.** The island has winding paths, cliffs, palms,
  trees and flowers, a fountain on the central plaza, a waterfall with a pond
  and a river that carries you towards the sea. A signpost points the way to
  every project, and the projects menu takes you straight to any of them.
- **A station for every project.** Each one is a small scene about the
  project: a satellite scanning a landfill, a factory with a truck on its
  route, a smart house whose lights switch on by themselves, an outdoor cinema
  fed by a serverless cloud, a terminal for the storage engine.
- **Real projects inside the panels.** The NoSQL key-value engine (written in
  Go) is compiled to WebAssembly and runs in a terminal in the browser, so you
  can type `PUT`, `GET` or `HLL COUNT` against the real engine. The landfill
  detection system and the factory & fleet monitoring platform run on their own
  servers and are shown live in their panels, with demo accounts, reload and
  full screen.
- **Sound made in code.** Generative music, waves, the waterfall and a sound
  for each station are synthesized with the Web Audio API (no audio files)
  and mixed by distance. Footsteps change with the ground, and the fox leaves
  paw prints in sand and on paths that fade over time. Music and sounds have
  their own volume sliders.
- **A character built in code.** The fox is made of simple shapes, with
  procedural walk, idle, jump and landing animations. It turns smoothly and
  has colliders that match its body.
- **Things that keep you in view.** Rocks and cliffs between the camera and
  the fox fade out. The camera follows the fox smoothly and zooms with the
  scroll wheel or the <kbd>+</kbd> / <kbd>-</kbd> keys.
- **Stylized, not heavy.** Flat-shaded terrain, waves and shore foam in custom
  shaders, soft shadows that follow the player. There are no image textures:
  everything is geometry, colors and a few small generated textures. The code
  is split into chunks that load in parallel behind a loading screen.
- **Works on phones.** A virtual joystick and a jump button, pinch to zoom,
  and panels that fit a small screen.

## Controls

| Action        | Keys                                |
| ------------- | ----------------------------------- |
| Move          | <kbd>W A S D</kbd> or arrow keys    |
| Jump          | <kbd>Space</kbd>                    |
| Open project  | <kbd>E</kbd> (when at a station)    |
| Close project | <kbd>Esc</kbd>                      |
| Zoom          | scroll, <kbd>+</kbd> / <kbd>-</kbd> |
| Reset zoom    | <kbd>R</kbd>                        |
| Sound on/off  | <kbd>M</kbd>                        |

On touch screens: the joystick in the bottom left moves the fox, the button on
the right jumps, and two fingers zoom.

## Tech stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org), built with [Vite](https://vite.dev)
- [React Three Fiber](https://r3f.docs.pmnd.rs) and [drei](https://drei.docs.pmnd.rs) on top of [three.js](https://threejs.org)
- [Rapier](https://rapier.rs) physics through [@react-three/rapier](https://github.com/pmndrs/react-three-rapier)
- [zustand](https://zustand.docs.pmnd.rs) for the small amount of shared game state
- Web Audio API for all music and sound effects
- Go → WebAssembly for the key-value engine demo
- Deployed on [Vercel](https://vercel.com); live project backends run with
  Docker on Oracle Cloud Always Free instances
- ESLint, Prettier, husky, lint-staged and commitlint (Conventional Commits)

## Getting started

You need [Node.js](https://nodejs.org) 20.19+ (or 22.12+) and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev        # start the dev server
pnpm build      # type-check and build for production into dist/
pnpm preview    # serve the production build locally
pnpm lint       # run ESLint
```

## Project structure

```
src/
├── App.tsx              # canvas, physics and the HTML overlay
├── fonts.ts             # fonts for text drawn in the 3D world
├── audio/               # music, ambience, station sounds and footsteps
├── projects/            # everything about the portfolio projects
│   ├── types.ts         # ProjectMeta, ProjectDefinition, station types
│   ├── registry.ts      # the list of projects shown in the world
│   ├── showcaseLoader.ts
│   └── <project>/       # meta.ts, and optionally Showcase.tsx / StationModel.tsx
├── stations/            # station placement, trigger zones and floating labels
├── store/               # zustand store (nearby / open project, zoom, sound)
├── styles/              # HTML overlay styles (ui.css, touch.css)
├── ui/                  # panels, menus, sound controls, touch controls, terminal
└── world/
    ├── World.tsx        # puts the whole scene together
    ├── island/          # terrain, water, paths, rocks, cliffs
    ├── decor/           # fountain, signpost, waterfall, pond, river
    ├── nature/          # palms, trees, bushes, flowers and grass
    └── player/          # the fox, movement, camera and controls
public/
├── fonts/               # Nunito and JetBrains Mono (SIL Open Font License)
└── projects/            # per-project assets, e.g. the engine's kv.wasm
```

## Adding a project

1. Create `src/projects/<slug>/meta.ts` exporting a `ProjectMeta`. It holds the
   title, a short title for the signpost, year, kind, summary, tech, links,
   accent color, the station's position on the island and, optionally, panel
   theme, icon and highlights.
2. Add it to the `projects` list in `src/projects/registry.ts`.

That is enough for a station with a plain pedestal, a path from the plaza, a
board on the signpost and a panel. Optionally, add:

- **An interactive showcase.** Create a `Showcase.tsx` with a default-exported
  component and set `loadShowcase: () => import('./<slug>/Showcase')`. It is
  downloaded in the background, separately from the main bundle, so the first
  load stays small.
  For a project that runs on its own server, the showcase can be just
  `<EmbeddedDemo url=... title=... />` (`src/ui/EmbeddedDemo.tsx`), which shows
  the live application with an address bar, full screen and a new-tab link.
- **A custom station.** Create a `StationModel.tsx` and set
  `station: { Model, labelHeight }`. The model faces the plaza (local `+z`), fits
  in about 3 × 3 units and adds its own colliders. Add `sound` (`typing`,
  `satellite`, `machines`, `beeps` or `projector`) to give it a sound nearby.

## Key-value engine demo

The engine lives in its own repository,
[nosql-storage-engine](https://github.com/andro02/nosql-storage-engine). Its
`cmd/wasm` entry point exposes a `kvExecute(command)` function to JavaScript.
To rebuild it, run this in that repository:

```bash
GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o kv.wasm ./cmd/wasm
```

Then copy `kv.wasm` to `public/projects/kv-storage-engine/`. If you build with
a different Go version, also copy `wasm_exec.js` from that Go installation
(`$(go env GOROOT)/lib/wasm/`) to
`src/projects/kv-storage-engine/engine/`. The engine's file I/O runs against
an in-memory, Node-style file system (`memoryFs.ts`), so nothing touches the
visitor's disk.

## Conventions

- Branches per feature (`feat/...`, `fix/...`), merged into `main` with `--no-ff`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org).
  commitlint checks them in a git hook.
- Staged files are linted and formatted automatically before every commit
  (husky + lint-staged).
- Line endings are LF everywhere (`.gitattributes`, `.editorconfig`).

## Author

**Andrija Slović**. Other projects are on [GitHub](https://github.com/andro02).
