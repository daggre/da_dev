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

> **Maintainer note — unresolved.** The exact upstream version this was forked from is
> not yet recorded. It needs to be, because Corresponding Source has to correspond to
> that version. Once identified, add the release tag here and commit a diff of this
> bundle against that release's published build.
>
> Narrowing so far: upstream's tagged releases begin at `v2.0.0`, and the move off
> three.js appears in the `v2.0.x` notes. Since this bundle still contains three.js, the
> base most likely predates `v2.0.0` — check upstream history rather than the tag list.
> Upstream's default branch commits no built bundle, so the build was obtained from a
> release asset.

### Corresponding Source

GPL-3.0 §6 requires that anyone distributing this in object-code form make the
Corresponding Source available.

- For the **underlying work**: the upstream repository linked above.
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
