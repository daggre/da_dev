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

### Corresponding Source

GPL-3.0 §6 requires that anyone distributing this in object-code form (the bundle is
minified) make the Corresponding Source available. The source for object_gizmo is the
upstream repository linked above.

> **Maintainer note — resolve before the next release.** If `gizmo.js` was rebuilt from
> *modified* object_gizmo source rather than taken as DemiAutomatic's published build,
> pointing at upstream is not sufficient: GPL-3.0 requires publishing the modified
> source and the scripts used to build it. In that case, push the fork and replace the
> link above with it.

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
