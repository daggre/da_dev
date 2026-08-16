# Third-party components

## object_gizmo — GPL-3.0

`ui/web/assets/gizmo.js` is a bundled build of **object_gizmo** by **DemiAutomatic**,
used for the in-game transform gizmo.

- Upstream: https://github.com/DemiAutomatic/object_gizmo
- License: GNU General Public License v3.0
- Upstream license text: https://github.com/DemiAutomatic/object_gizmo/blob/main/LICENSE

**This is why `da_dev` is licensed GPL-3.0** rather than MIT like the rest of the
toolkit. object_gizmo is strong copyleft, `gizmo.js` is loaded into the same NUI page as
`da_dev`'s own scripts and exchanges data with them, and the two ship together — so
`da_dev` as distributed is a combined work and inherits GPL-3.0.

### Modifications (GPL-3.0 §5a)

**`ui/web/assets/gizmo.js` is a MODIFIED version of object_gizmo.** Modified by
daggre_actual; the file in this repository dates from 2026-06-23.

The modifications were made by editing values directly in the distributed bundle. There
is no separate source tree and no build scripts for them — the file as committed here is
the only form these changes exist in, and it is the form used to make them.

The base is an **older, three.js-based release** of object_gizmo (the bundle contains
three.js and React 18.2.0); upstream has since moved off three.js, so the current
upstream release is not the right comparison point.

#### Provenance — how the base was identified

The exact upstream revision was not recorded at the time, so it was established by
comparing this bundle against published builds:

- This bundle shares the application-level NUI identifier **`setGizmoEntity`** with the
  build committed at
  [dodibanScripts/object_gizmo](https://github.com/dodibanScripts/object_gizmo)
  (`web/dist/assets/index.b9a3b3cb.js`, GPL-3.0, September 2024). That string is not
  part of React, three.js or react-three-fiber — it is this application's own protocol
  name — which establishes shared lineage rather than merely a shared dependency stack.
- That repository also carries the **full TypeScript source** under `web/src/`, built
  with Vite, from the three.js era of the project. It is the closest public source tree
  to this bundle's generation.
- The two are not the same build: this bundle is ~92 KB larger and additionally bundles
  Recoil, and the app-level callback names differ (`gizmoStop` here versus
  `moveEntity` / `finishEdit` / `stopEditing` / `placeOnGround` there). So this is a
  *different revision* of the same project, not a copy of that build.

`DemiAutomatic/object_gizmo` is the older repository (created 2023, still maintained) and
carries the project's description, so it is treated here as the origin; the
`dodibanScripts` copy is significant because it preserves a source tree and a build from
the right era, which upstream's default branch does not commit.

> **Maintainer note — still open.** The precise revision is not pinned. If this matters,
> diff this bundle against `dodibanScripts`' build to enumerate the actual changes, and
> record the result here.

### Corresponding Source

GPL-3.0 §6 requires that anyone distributing this in object-code form make the
Corresponding Source available.

- For the **underlying work**: the upstream repository linked above, and — for a source
  tree of the same three.js-era generation as this bundle —
  [dodibanScripts/object_gizmo](https://github.com/dodibanScripts/object_gizmo)
  `web/src/` (GPL-3.0).
- For the **modifications**: the bundle committed in this repository, which is the
  preferred and only form in which they exist.

This is a weaker position than shipping a proper source tree. The intended fix is to
stop shipping a modified bundle at all — see below.

### Preferred resolution

The changes are a small number of values. The better arrangement is to restore the
pristine upstream bundle and move those values into `da_dev`'s own code: `gizmo.js` is
loaded as a module *before* `ui/web/script.js`, so an override can be applied after it
loads, or passed through the existing `setGizmoEntity` / `setGizmoState` NUI messages.

That would make `da_dev` a plain redistributor of an unmodified GPL work — no §5
obligations, Corresponding Source is simply upstream — and would put the customisation
in the codebase that actually owns it.

### Scope

The copyleft applies to `da_dev` only. It does not reach `da_lib`, `da_log`, `da_anims`,
`da_props` or `da_game`, which are separate resources under the MIT license — `da_dev`
depends on them, not the other way around, and MIT is GPL-compatible.

---

## rdr3_discoveries — control data

`da_lib/data/control.lua` (a dependency, not part of this resource) derives its RDR3
control name-to-hash table from
[femga/rdr3_discoveries](https://github.com/femga/rdr3_discoveries). Attribution is in
that file's header. Listed here for completeness.

---

## Everything else

All other code, UI and assets in `da_dev` are original work by daggre_actual, released
under GPL-3.0 as described in [LICENSE](LICENSE).

React and three.js appear inside the `gizmo.js` bundle as object_gizmo's own
dependencies; both are MIT licensed, and their notices are preserved inside that bundle.
