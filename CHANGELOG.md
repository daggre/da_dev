# Changelog

## [1.0.0] - 2026-08-15

First stable release.

### Added
- **Access control.** `da_dev` is off unless a server turns it on, so it ships happily
  in the same resources folder you deploy anywhere. The `da_dev_enabled` convar controls
  it: `0` (default) doesn't load, `1` runs with a per-player `da_dev` ACE check, `2`
  allows everyone (local box only). See `DEV-TOOLS.md` in the devkit repo.
- `da_dev_reauth` console command, to re-check every player after editing ACEs.

### Provides
- Object editor — spawn, place, rotate and attach entities, with a placement gizmo
- Animation editor — build and preview scenarios live, with prop attachment, timeline
  and export to a `da_anims` config
- Freecam, teleport, ped spawning, attribute and weapon editing
- Bone inspection, key monitor, carcass probe, vegetation tools
- Web-based NUI overlay with a themeable interface
- Dev menu registration so other resources can add their own entries

### Notes
- A development tool — meant for a dev server rather than a live one. See
  `DEV-TOOLS.md` in the devkit repo for turning it on and granting access.
