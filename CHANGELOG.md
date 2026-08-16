# Changelog

## [1.0.0] - 2026-08-15

First stable release.

### Added
- **Authorization gate.** `da_dev` is now deny-by-default and safe to ship in a shared
  resources folder. The `da_dev_enabled` convar controls it:
  `0` (default) stops the resource at boot, `1` runs it with a per-player `da_dev` ACE
  check, `2` allows everyone (solo/local only). See `SECURITY.md` in the devkit repo.
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
- Development tool. Read `SECURITY.md` before installing anywhere players can connect.
