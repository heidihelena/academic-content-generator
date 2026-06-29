# forskAI Design System

A small, **dependency-free** design system in the spirit of shadcn/ui: typed,
variant-driven primitives composed from the Tailwind tokens defined in
`src/index.css` + `tailwind.config.js`. No Radix, no `class-variance-authority`,
no `tailwind-merge` — a local `cn()` and `cva()` (`src/components/ui/cn.ts`,
`cva.ts`) give the same authoring ergonomics while honoring this repo's
local-first, minimal-dependency principle.

Import everything from one entry point:

```ts
import { Button, Card, CardHeader, CardTitle, Badge, Field, Input, Heading, Text } from './ui';
```

The theme is driven by CSS variables (`--surface-*`, `--slate-*`) so a single
set of tokens reskins the whole app between the **ink** (dark) and **paper**
(light) palettes — never hard-code hex colors in components.

---

## 1. Typography scale

Use the `Heading` and `Text` primitives (`ui/Typography.tsx`) rather than
re-deriving class combos.

| Role | Component | Classes |
| --- | --- | --- |
| Page title | `<Heading level={1}>` | `text-lg font-semibold text-slate-100` |
| Panel title | `<Heading level={2}>` (default) | `text-sm font-semibold text-slate-200` |
| Item / sub-title | `<Heading level={3}>` | `text-sm font-medium text-slate-200` |
| Body | `<Text>` | `text-sm text-slate-200` |
| Secondary | `<Text variant="secondary">` | `text-sm text-slate-300` |
| Muted / help | `<Text variant="muted">` | `text-xs text-slate-500` |
| Fine print | `<Text variant="tiny">` | `text-[11px] text-slate-500` |

`Heading` takes `as` to keep semantics correct (e.g. a visually-level-2 heading
rendered as `<h3>`). The font is Inter; weights are limited to `medium` (500)
and `semibold` (600).

---

## 2. Spacing rules

A 4px base scale (Tailwind defaults). Conventions used throughout:

- **Inside a card:** `p-4` (compact panels) or `p-5` (form-heavy panels).
- **Vertical stacks:** `space-y-4` between form rows, `space-y-2`/`space-y-3`
  for tight lists, `space-y-5` between major sections of a panel.
- **Inline gaps:** `gap-2` for button rows and icon+label, `gap-1.5` for chips
  and dense metadata rows, `gap-3` for grid columns.
- **Section dividers:** `border-t border-surface-700 pt-4` to separate blocks
  within a card; `CardHeader`/`CardFooter` apply this automatically.

Prefer `space-y-*`/`gap-*` on a container over per-child margins.

---

## 3. Button variants

`<Button>` (`ui/Button.tsx`) maps to the `.btn-*` classes — the raw CSS stays
the single source of truth.

| Variant | Use for | Looks like |
| --- | --- | --- |
| `primary` (default) | the one main action per surface | filled aurora |
| `secondary` | supporting actions | filled surface |
| `ghost` | low-emphasis / toolbar actions | transparent, hover fill |
| `danger` | destructive actions | red-tinted |

Props: `variant`, `size` (`md` default, `sm` for dense rows), and `loading`
(shows a spinner + disables). Defaults to `type="button"`.

```tsx
<Button onClick={save}>Save post</Button>
<Button variant="secondary" size="sm" onClick={copy}>Copy</Button>
<Button variant="danger" loading={deleting} onClick={remove}>Delete</Button>
```

**Rule:** exactly one `primary` button per view/region; everything else is
`secondary`/`ghost`.

---

## 4. Card patterns

`<Card>` is the bordered surface (`.card`); compose the parts for a consistent
internal rhythm (`ui/Card.tsx`).

```tsx
<Card>
  <CardHeader>
    <Icon /> <CardTitle>Connected accounts</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```

`Card` doesn't force padding, so a simple panel can still be `<Card className="p-4">`
with freeform content. Use `CardContent`/`CardHeader`/`CardFooter` when you want
the standard spacing and divider lines.

---

## 5. Form patterns

`<Field>` wraps a labelled control with optional hint/error; pair it with
`Input` / `Textarea` / `Select` (all map to `.input`).

```tsx
<Field label="Target audience" htmlFor="audience" hint="Who is this for?">
  <Input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} />
</Field>

<Field label="Voice" htmlFor="voice" error={err}>
  <Select id="voice" value={voice} onChange={…}>…</Select>
</Field>
```

- Always give the control an `id` and pass it as `Field`'s `htmlFor`.
- Use `error` for validation messages (renders in `status-failed` with
  `role="alert"`); use `hint` for neutral guidance — they don't both show.
- Inputs that are part of a larger composite (e.g. inline DOI field) may use
  `Input`/`Textarea` directly without `Field`.

---

## 6. Status badges

Two tools:

- **`<StatusBadge status={…}>`** (`PlatformBadge.tsx`) — the canonical pill for a
  post's lifecycle stage (`brief`→`failed`), carrying the per-stage color.
- **`<PlatformBadge platform={…}>`** — a platform-tinted icon chip.
- **`<Badge>`** (`ui/Badge.tsx`) — the generic token for everything else.

```tsx
<Badge tone="brand">Configured</Badge>
<Badge tone="success" size="pill">Live</Badge>
<Badge size="chip">{source.kind}</Badge>      {/* squared, uppercase tag */}
```

`tone`: `neutral` · `brand` · `success` · `warn` · `danger` · `info`.
`size`: `pill` (default, rounded-full) · `chip` (squared, uppercase, for tiny
category tags like kind / channel / score).

---

## 7. Empty states

`<EmptyState>` (`ui/States.tsx`) — a dashed-border, centered panel for "nothing
here yet," with an optional icon, description and call-to-action.

```tsx
<EmptyState
  icon={<InboxIcon />}
  title="No sources yet"
  description="Add a paper or note, or point the app at your Obsidian vault."
  action={<Button onClick={add}>Add source</Button>}
/>
```

Title is the plain-language summary; description gives the next step; `action`
is a single `primary` button.

---

## 8. Error states

`<ErrorState>` — a red-tinted alert panel (`role="alert"`) with a retry.

```tsx
<ErrorState message={error} onRetry={reload} />
<ErrorState title="Vault search failed" message={vaultError} onRetry={search} />
```

Default title is *"Couldn't complete that."* Always provide `onRetry` when the
action is repeatable. For inline field errors, use `Field`'s `error` prop
instead.

---

## 9. Loading states

- **`<Spinner>`** — inline indicator; use inside buttons via `Button`'s
  `loading` prop, or standalone for small async regions.
- **`<LoadingState label="Loading…">`** — a centered spinner + label for a whole
  data surface (lists, panels) before first paint.

```tsx
<Button loading={saving}>Save</Button>
{loading ? <LoadingState label="Loading your sources…" /> : <List … />}
```

---

## Adding a primitive

Keep them small and token-based. Author variant class strings so they don't
fight each other (we have no `tailwind-merge`); the consumer's `className` is
always appended last and wins by source order. Export from `ui/index.ts`, and
document the pattern here.
