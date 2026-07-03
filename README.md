# da_dev

Development Kit for RedM. Provides in-game tools for building scenes, testing animations, and placing objects, accessible through a custom web-based UI.

## Version & Status

v0.2

## Dependencies

- `da_log`
- `da_lib`

## Installation

1. Place `da_dev` in your resources directory
2. Add to `server.cfg` after da_log and da_lib:
   ```
   ensure da_dev
   ```
3. Enable debug mode for verbose logging (optional):
   ```
   setr debug 1
   ```

## Overview

da_dev registers modes through da_lib's mode system. All tools are accessed through keybinds once a mode is active. The UI is a NUI overlay (HTML/JS/CSS) rendered in-game.

## Modes & Tools

### FreeCam Mode

A free-flying camera for navigating the world without moving your character.

**Activate:** Enter via the dev tree menu or keybind.

| Key | Action |
|-----|--------|
| W / A / S / D | Move camera |
| E / Q | Move up / down |
| Mouse wheel | Adjust speed |
| Shift + Mouse | Pan (forward/back/left/right) |
| Ctrl + Mouse | Rotate camera |
| Alt + Mouse | Adjust FOV |
| Alt + X | Reset FOV |
| Z | Open dev tree menu |
| H | Toggle help |
| Esc | Exit FreeCam |

---

### Object Editor Mode

Spawn, place, and manage objects (props, peds, vehicles) in scenes. Objects can be exported to YMAP format.

**Activate:** Enter via the dev tree menu or keybind.

| Key | Action |
|-----|--------|
| LMB | Select object |
| Shift + LMB | Spawn selected object type at cursor |
| RMB | Context menu for object |
| MMB click | Toggle control passthrough |
| MMB hold | Hold control passthrough |
| F | Focus camera on selected object |
| G | Clone selected object |
| R | Toggle gizmo (position/rotation handles) |
| Ctrl + F | Freeze / unfreeze selected object |
| Ctrl + R | Reload current scene |
| Ctrl + S | Save current scene |
| Ctrl + T | Toggle transparency on selected object |
| Shift + X | Delete selected object |
| Shift + S | Open settings panel |
| 1 | Object spawn HUD |
| 2 | Scene management HUD |
| 3 | Nearby objects HUD |
| H | Toggle help |

**UI Panels:**
- **Object Spawn** — Browse the object database, filter by name, spawn by clicking
- **Scene Management** — Save named scenes, reload, delete; scenes persist across sessions
- **Nearby Objects** — List all entities near the player, filterable by type (object/ped/vehicle/scene)

**Gizmo:** 3D handles for dragging position and rotating objects. Toggle with R while an object is selected.

**Export:** Scenes can be exported to YMAP format for use as server-side map additions.

---

### Animation Editor Mode

Browse and configure animations from the game's animation dictionaries.

**Activate:** Enter via the dev tree menu or keybind.

| Key | Action |
|-----|--------|
| MMB click | Toggle control passthrough |
| 1 | Animation search HUD |
| 2 | Configuration HUD |
| Shift + S | Settings panel |
| Tab | Cycle keyboard focus |
| Spacebar | Toggle focused element |
| H | Toggle help |
| Esc | Exit Animation Editor |

**UI Panels:**
- **Animation Search** — Type to search animation dictionaries and names; click to preview on your character
- **Configuration** — Set blend-in, blend-out, duration, playback rate, animation flags, and IK flags; queue multiple animations for sequenced playback

---

### Dev Tree Mode

A hierarchical keyboard-navigable menu for quick access to development commands.

**Activate:** Hold X (long press), or press Z while in FreeCam.

- Navigate with the keys shown next to each menu item
- Press any unregistered key to close the menu

---

### Additional Tools

- **Teleport** — Jump to saved positions
- **Ped Spawning** — Spawn and configure NPCs
- **Bull Ride Testing** — Test bull riding mechanics

## UI Architecture

The UI lives in `ui/web/` and uses ES6 modules. It communicates with Lua via:
- **Lua → UI:** `SendNUIMessage({ type = "eventName", ... })`
- **UI → Lua:** `fetch()` POST to `https://${GetParentResourceName()}/endpoint`

**Updating UI files** (HTML/JS/CSS) requires a client refresh in-game (`Reconnect` or `F8 → reconnect`). Lua changes only require `restart da_dev` in the server console.

## Theme System

The UI supports runtime theme customization via the settings panel (Shift+S). Themes use CSS variables (`--primary`, `--bg`, `--brd-rad`, etc.). Settings include:
- Color theme
- Divider style (chevron or other)
- Border display toggle
- Rounded corners and roundness value
- Autohide camera speed display
- Tooltip display
- Submit forms on Enter

## Authors

- daggre_actual
