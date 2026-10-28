# Portfolio World

An interactive 3D portfolio. Instead of scrolling through a list, you walk a
small fox around a low-poly island and visit a station for each project. Step
up to a station and press <kbd>E</kbd>. A panel opens with what the project
does, the tech behind it, a link to the code and, where possible, a live demo
you can try right there.

> Live version: coming soon.

## Highlights

- **A world you walk through.** The island has winding paths, cliffs, a
  fountain on the central plaza, a waterfall with a pond and a river that
  carries you towards the sea. A signpost points the way to every project.
- **Playable demos inside the panels.** The NoSQL key-value engine (written in
  Go) is compiled to WebAssembly and runs in a terminal in the browser, so you
  can type `PUT`, `GET` or `HLL COUNT` against the real engine.
- **A character built in code.** The fox is made of simple shapes, with
  procedural walk, idle, jump and landing animations. It turns smoothly and
  has colliders that match its body.
- **Things that keep you in view.** Rocks and cliffs between the camera and
  the fox fade out. The camera follows the fox smoothly and zooms with the
  scroll wheel or the <kbd>+</kbd> / <kbd>-</kbd> keys.
- **Stylized, not heavy.** Flat-shaded terrain, waves and shore foam in custom
  shaders, soft shadows that follow the player. There are no image textures:
  everything is geometry, colors and a few small generated textures.

## Controls

| Action        | Keys                                |
| ------------- | ----------------------------------- |
| Move          | <kbd>W A S D</kbd> or arrow keys    |
| Jump          | <kbd>Space</kbd>                    |
| Open project  | <kbd>E</kbd> (when at a station)    |
| Close project | <kbd>Esc</kbd>                      |
| Zoom          | scroll, <kbd>+</kbd> / <kbd>-</kbd> |
| Reset zoom    | <kbd>R</kbd>                        |

## Tech stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org), built with [Vite](https://vite.dev)
- [React Three Fiber](https://r3f.docs.pmnd.rs) and [drei](https://drei.docs.pmnd.rs) on top of [three.js](https://threejs.org)
- [Rapier](https://rapier.rs) physics through [@react-three/rapier](https://github.com/pmndrs/react-three-rapier)
- [zustand](https://zustand.docs.pmnd.rs) for the small amount of shared game state
- Go → WebAssembly for the key-value engine demo
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
├── projects/            # everything about the portfolio projects
│   ├── types.ts         # ProjectMeta, ProjectDefinition, station types
│   ├── registry.ts      # the list of projects shown in the world
│   ├── showcaseLoader.ts
│   └── <project>/       # meta.ts, and optionally Showcase.tsx / StationModel.tsx
├── stations/            # station placement, trigger zones and floating labels
├── store/               # zustand store (nearby / open project, zoom)
├── styles/ui.css        # all HTML overlay styles
├── ui/                  # project panel, prompts, controls legend, terminal
└── world/
    ├── World.tsx        # puts the whole scene together
    ├── island/          # terrain, water, paths, rocks, cliffs
    ├── decor/           # fountain, signpost, waterfall, pond, river
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
- **A custom station.** Create a `StationModel.tsx` and set
  `station: { Model, labelHeight }`. The model faces the plaza (local `+z`), fits
  in about 3 × 3 units and adds its own colliders.

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
