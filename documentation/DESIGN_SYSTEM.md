# Doctor Tracker — Design System

Implementation contract for the frontend. Stack: Next.js App Router, Tailwind CSS v4, shadcn/ui,
Lucide, Recharts, next-themes (`attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`).
Everything here is meant to be copied as written. If a case is not covered, pick the quieter option.

## 1. Design principles

- **Data first, chrome last.** The table, the number and the chart are the interface. Surfaces are flat, borders are hairlines, colour is spent only on meaning (primary action, status, data series).
- **One accent.** A single teal carries every primary action, active nav item, focus ring and first data series. Nothing else is saturated unless it is a status or a chart series.
- **Dense but breathable.** 14px body, 48px table rows, 8px grid. An admin should see 10 rows and the toolbar without scrolling on a 768px-tall viewport.
- **Predictable.** Same page skeleton everywhere: PageHeader, toolbar, content, pagination. Same button order, same dialog widths, same empty/error/loading shapes.
- **Numbers are typeset.** Every count, age, date, phone and ID uses tabular figures and right/consistent alignment so columns scan vertically.
- **Safe by default.** Destructive actions are never primary-coloured, always confirmed, and always name the record being removed. Every state (loading, empty, error) is designed, never blank.

## 2. Colour tokens

Primary is a **deep clinical teal, `oklch(0.48 0.078 200)` (~`#00697A`)**: it reads as healthcare without
the default "SaaS blue", and is dark enough to carry white text at 6:1. Neutrals are cool greys (hue 240-250, chroma <= 0.02).

Paste into `app/globals.css` (replaces the shadcn-generated blocks).

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.5rem;

  --background: oklch(0.985 0.003 240);
  --foreground: oklch(0.21 0.02 250);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.21 0.02 250);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.21 0.02 250);
  --primary: oklch(0.48 0.078 200);
  --primary-foreground: oklch(0.985 0.005 200);
  --secondary: oklch(0.96 0.006 240);
  --secondary-foreground: oklch(0.27 0.02 250);
  --muted: oklch(0.965 0.005 240);
  --muted-foreground: oklch(0.5 0.02 250);
  --accent: oklch(0.95 0.02 200);
  --accent-foreground: oklch(0.32 0.052 200);
  --destructive: oklch(0.53 0.2 27);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.915 0.008 240);
  --input: oklch(0.82 0.012 240);
  --ring: oklch(0.58 0.092 200);

  --success: oklch(0.5 0.12 155);
  --success-foreground: oklch(0.985 0 0);
  --warning: oklch(0.52 0.11 70);
  --warning-foreground: oklch(0.985 0 0);
  --info: oklch(0.5 0.13 250);
  --info-foreground: oklch(0.985 0 0);

  --chart-1: oklch(0.6 0.095 200);   /* teal      */
  --chart-2: oklch(0.4 0.15 268);    /* indigo    */
  --chart-3: oklch(0.67 0.135 75);   /* amber     */
  --chart-4: oklch(0.52 0.16 30);    /* terracotta*/
  --chart-5: oklch(0.36 0.09 340);   /* plum      */
  --chart-other: oklch(0.72 0.012 250); /* "Other" bucket, neutral */
  --chart-grid: oklch(0.915 0.008 240);

  --sidebar: oklch(0.975 0.004 240);
  --sidebar-foreground: oklch(0.21 0.02 250);
  --sidebar-primary: oklch(0.48 0.078 200);
  --sidebar-primary-foreground: oklch(0.985 0.005 200);
  --sidebar-accent: oklch(0.94 0.02 200);
  --sidebar-accent-foreground: oklch(0.3 0.048 200);
  --sidebar-border: oklch(0.915 0.008 240);
  --sidebar-ring: oklch(0.58 0.092 200);
}

.dark {
  --background: oklch(0.17 0.012 250);
  --foreground: oklch(0.95 0.005 240);
  --card: oklch(0.21 0.014 250);
  --card-foreground: oklch(0.95 0.005 240);
  --popover: oklch(0.23 0.014 250);
  --popover-foreground: oklch(0.95 0.005 240);
  --primary: oklch(0.72 0.1 195);
  --primary-foreground: oklch(0.17 0.02 200);
  --secondary: oklch(0.27 0.015 250);
  --secondary-foreground: oklch(0.95 0.005 240);
  --muted: oklch(0.25 0.014 250);
  --muted-foreground: oklch(0.71 0.02 250);
  --accent: oklch(0.29 0.035 200);
  --accent-foreground: oklch(0.9 0.05 195);
  --destructive: oklch(0.7 0.17 25);
  --destructive-foreground: oklch(0.17 0.02 25);
  --border: oklch(0.3 0.015 250);
  --input: oklch(0.36 0.016 250);
  --ring: oklch(0.72 0.1 195);

  --success: oklch(0.74 0.14 155);
  --success-foreground: oklch(0.17 0.02 250);
  --warning: oklch(0.8 0.14 80);
  --warning-foreground: oklch(0.17 0.02 250);
  --info: oklch(0.74 0.11 245);
  --info-foreground: oklch(0.17 0.02 250);

  --chart-1: oklch(0.78 0.11 195);
  --chart-2: oklch(0.58 0.16 268);
  --chart-3: oklch(0.84 0.13 82);
  --chart-4: oklch(0.68 0.16 30);
  --chart-5: oklch(0.52 0.11 340);
  --chart-other: oklch(0.5 0.015 250);
  --chart-grid: oklch(0.3 0.015 250);

  --sidebar: oklch(0.19 0.013 250);
  --sidebar-foreground: oklch(0.95 0.005 240);
  --sidebar-primary: oklch(0.72 0.1 195);
  --sidebar-primary-foreground: oklch(0.17 0.02 200);
  --sidebar-accent: oklch(0.27 0.03 200);
  --sidebar-accent-foreground: oklch(0.9 0.05 195);
  --sidebar-border: oklch(0.3 0.015 250);
  --sidebar-ring: oklch(0.72 0.1 195);
}

@theme inline {
  --font-sans: var(--font-plex-sans);
  --font-mono: var(--font-plex-mono);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-chart-other: var(--chart-other);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);  /* 4px  */
  --radius-md: calc(var(--radius) - 2px);  /* 6px  */
  --radius-lg: var(--radius);              /* 8px  */
  --radius-xl: calc(var(--radius) + 4px);  /* 12px, dialogs only */
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground antialiased; }
}
```

**Two changes to generated shadcn components:** (1) the destructive `Button` variant ships with
`text-white` — change it to `text-destructive-foreground` (white on the dark-theme destructive is only 3.3:1);
(2) status colours are used as *soft* fills: `bg-success/10 text-success` (same for `warning`, `info`, `destructive`), never as large solid blocks.

### Contrast pairs checked (WCAG 2.x ratio, computed from the oklch values above)

| Pair (text on surface) | Light | Dark | Needs |
|---|---|---|---|
| foreground on background / card | 17.0 / 17.7 | 16.5 / 15.3 | 4.5 |
| muted-foreground on background / card / muted | 5.7 / 6.0 / 5.4 | 7.4 / 6.9 / 6.2 | 4.5 |
| primary-foreground on primary | 6.0 | 8.0 | 4.5 |
| primary (links, icons) on background / card | 6.0 / 6.3 | 8.0 / 7.5 | 4.5 |
| accent-foreground on accent | 10.8 | 10.5 | 4.5 |
| sidebar-accent-foreground on sidebar-accent | 11.3 | 11.3 | 4.5 |
| muted-foreground on sidebar | 5.6 | 7.2 | 4.5 |
| destructive-foreground on destructive | 5.6 | 6.7 | 4.5 |
| destructive text on card | 5.9 | 6.1 | 4.5 |
| success / warning / info text on card | 5.7 / 5.7 / 6.0 | 8.1 / 9.4 / 7.8 | 4.5 |
| success / warning / info / destructive text on own `/10` tint | 4.9 / 4.9 / 5.2 / 5.0 | 6.9 / 7.8 / 6.6 / 5.4 | 4.5 |
| `*-foreground` on solid success / warning / info | 5.4 / 5.4 / 5.7 | 8.8 / 10.1 / 8.4 | 4.5 |
| ring on background / card (focus indicator) | 3.9 / 4.1 | 8.0 / 7.5 | 3.0 |
| chart-1..5 on card (graphical objects) | 3.8 / 9.6 / 3.1 / 6.0 / 11.4 | 9.3 / 4.0 / 10.7 / 5.7 / 3.0 | 3.0 |
| badge tints, section 6.6 (worst case) | 6.8 | 7.7 | 4.5 |

Known and accepted: `--border` (1.3:1) and `--input` (1.7:1) are decorative hairlines below the 3:1
non-text threshold, as in stock shadcn. Therefore **every input must have a visible label** and never rely on
its border alone to be found; the focus ring does meet 3:1.

### Chart colour rules

- Series order is fixed: 1 teal, 2 indigo, 3 amber, 4 terracotta, 5 plum. The lightness is deliberately staggered (0.60 / 0.40 / 0.67 / 0.52 / 0.36 in light) so series separate by luminance, not hue alone. Checked with a full-severity deuteranopia and protanopia simulation (Machado matrices): minimum pairwise OKLab distance 0.13 light, 0.14 dark.
- **Never colour alone.** Donut slices get a 2px `stroke="var(--card)"` gap and a legend with name + value; multi-series lines get a legend and distinct tooltips rows.
- **One dimension, one colour.** A bar chart whose categories are already named on the axis (patients per doctor, doctors per specialization) uses `--chart-1` for every bar. Do not rainbow bars.
- **More than 5 categories:** sort descending, show the top 5 in chart-1..5, fold the rest into one **"Other"** slice in `--chart-other` listed last; the tooltip/legend for "Other" shows the count of folded categories. If the "Other" share exceeds ~40%, switch the donut to a single-colour horizontal bar chart.
- Reference as `var(--chart-1)` in Recharts props (`fill`, `stroke`); do not hard-code hex.

## 3. Typography

```ts
// app/layout.tsx
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });
// <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
```

UI font: **IBM Plex Sans** — engineered, slightly technical letterforms and true tabular figures; it reads as
"instrument", not "marketing site". **IBM Plex Mono** is used only for record IDs and keyboard hints.

| Role | Classes | Size / line |
|---|---|---|
| Page title (h1) | `text-xl font-semibold tracking-tight md:text-2xl` | 20/28 -> 24/32 |
| Section title (h2) | `text-base font-semibold` | 16/24 |
| Card title (h3) | `text-sm font-medium` | 14/20 |
| Body / table cell | `text-sm` | 14/20 |
| Small / secondary line | `text-sm text-muted-foreground` | 14/20 |
| Caption / table header / label over stat | `text-xs font-medium text-muted-foreground` | 12/16 |
| Stat number | `text-2xl font-semibold tabular-nums tracking-tight` | 24/32 |
| Login heading | `text-2xl font-semibold tracking-tight` | 24/32 |
| ID / code | `font-mono text-xs` | 12/16 |

Rules: weights are 400, 500, 600 only (no 700). `tracking-tight` only at 20px and above; never letter-space
or uppercase body text (table headers are sentence case, not ALL CAPS). Nothing in the app exceeds 24px.
Add `tabular-nums` to every numeric cell, stat, pagination count, chart tick, date and phone; right-align
purely numeric columns (patient count, age). Dates render as `12 Nov 2026` (`Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })`),
with the full ISO timestamp in a `title`/tooltip. Long text truncates with `truncate` + `title`, never wraps a table row.

## 4. Spacing, radius, elevation, borders

| Thing | Value |
|---|---|
| Base grid | 4px; use Tailwind steps 1, 1.5, 2, 3, 4, 6, 8 only |
| Page padding | `px-4 py-4` (<768) · `md:px-6 md:py-6` · `lg:px-8` |
| Vertical rhythm between page blocks | `space-y-6` (`space-y-4` on mobile) |
| Grid gap between cards | `gap-4` (`lg:gap-6` only on the dashboard chart rows) |
| Card padding | `p-4 md:p-5`; card header to body gap `gap-4` |
| Form field stack | `space-y-4`; label to control `gap-1.5` |
| Radius | cards, tables, popovers `rounded-lg` (8px); buttons, inputs, selects `rounded-md` (6px); badges `rounded-md`; avatars `rounded-full`; dialogs `rounded-xl` (12px). Nothing larger. |
| Borders | 1px `border-border` on every card and table; dividers `divide-y divide-border` |
| Control heights | buttons and inputs `h-9` (36px); compact icon buttons `size-8`; on touch (<768) row actions and nav items get `min-h-11` hit areas |

**Elevation:** cards and tables are flat: `border bg-card`, **no shadow** (remove shadcn's default `shadow-sm`
on `Card`). Shadow is allowed only on things that float above the page: dropdowns/popovers/select menus
`shadow-md`, dialogs and sheets `shadow-lg`, toasts `shadow-lg`, the sticky mobile header `shadow-xs` once scrolled.
No coloured shadows, no gradients, no backdrop blur (dialog overlay is flat `bg-black/50`).

## 5. Layout shell

```
+----------+--------------------------------------------------+
| Sidebar  | Header h-14: [=] Breadcrumb        [theme] [AD v] |
| 240 / 56 +--------------------------------------------------+
|          | <main> max-w-[1440px] mx-auto, page padding       |
+----------+--------------------------------------------------+
```

- **Sidebar** (shadcn `Sidebar`, `collapsible="icon"`): `--sidebar-width: 15rem` (240px), `--sidebar-width-icon: 3.5rem` (56px). `bg-sidebar border-r`. Top: 56px brand row (20px Lucide `Stethoscope` in a `size-8 rounded-md bg-primary text-primary-foreground` tile + "Doctor Tracker" `text-sm font-semibold`). Nav: `LayoutDashboard` Dashboard, `Stethoscope` Doctors, `Users` Patients; `Settings` pinned to the bottom group. Collapse toggle is `SidebarTrigger` in the header; state persists (cookie) and `Ctrl/Cmd+B` toggles.
- **Nav item:** `h-9 gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`; active (prefix match, so `/doctors/123` lights Doctors): `bg-sidebar-accent text-sidebar-accent-foreground font-medium` + `aria-current="page"`. Icons `size-4`, stroke 1.75. Collapsed: icon only with a right-side tooltip.
- **Header:** `sticky top-0 z-30 h-14 border-b bg-background px-4 md:px-6`, flex row. Left: sidebar trigger, 16px vertical separator, breadcrumb. Right: theme switcher (`size-8` ghost icon button, Sun/Moon, dropdown Light/Dark), profile dropdown (32px avatar initials; menu shows name, email in `text-xs text-muted-foreground`, separator, Settings, Log out in `text-destructive`).
- **Content:** `mx-auto w-full max-w-[1440px]`; forms/detail info blocks cap at `max-w-3xl`.

| Breakpoint | Sidebar | Tables | Grids |
|---|---|---|---|
| Mobile <768 | Hidden; hamburger opens a left `Sheet` (`w-72`), closes on route change | Stacked cards | 1 column; stat cards 2 columns |
| Tablet 768-1023 | Icon rail (56px) by default | Real table; low-priority columns hidden (`hidden lg:table-cell`: phone, created) | 2 columns |
| Desktop >=1024 | Expanded 240px, user-collapsible | Full table | 12-column dashboard grid |

**Breadcrumb:** from the route: `Dashboard`, `Doctors`, `Doctors / Dr. Sara Khan`, `Patients / Amir Ali`. Last crumb is
plain text `text-foreground font-medium` with `aria-current="page"`, earlier crumbs are links in `text-muted-foreground hover:text-foreground`,
separator is a `ChevronRight size-3.5`. Entity crumbs show the record name (skeleton `h-4 w-24` while loading), never the raw ID.
On mobile show only the last crumb with a back chevron to its parent. `body` gets `overflow-x-hidden`; every flex child holding text gets `min-w-0`.

## 6. Component specs

**6.1 StatCard** — `rounded-lg border bg-card p-4 md:p-5`. Row 1: label (`text-xs font-medium text-muted-foreground`) left,
icon right in `size-8 rounded-md bg-accent text-accent-foreground` tile (`size-4` icon). Row 2 (`mt-2`): value in stat-number style.
Row 3 (`mt-1 text-xs text-muted-foreground`): context such as "+12 vs last month"; the delta itself is `text-success` with `ArrowUpRight`
or `text-destructive` with `ArrowDownRight` (icon + sign, not colour alone); omit the row if there is no comparison. All four cards
use the same teal tile; do not give each card its own colour. Grid: `grid grid-cols-2 gap-4 lg:grid-cols-4`.

**6.2 PageHeader** — `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. Left: h1 page title + optional
`mt-1 text-sm text-muted-foreground` one-line description (include the live total: "128 doctors"). Right: actions, primary last
(`<Button><Plus className="size-4" /> Add doctor</Button>`). On mobile the primary button is `w-full sm:w-auto`. Max one primary button per page.

**6.3 DataTable** (TanStack Table + shadcn `Table`)
- Wrapper `rounded-lg border bg-card overflow-hidden`; toolbar above it and pagination below it sit outside the border.
- Header row `h-10 bg-muted/50`; `th` = `px-4 text-xs font-medium text-muted-foreground text-left`. Body row `h-12 border-b last:border-0 hover:bg-muted/50 transition-colors`; `td` = `px-4 py-2 text-sm`.
- Sticky header: **no** — the page scrolls, not the table, and pagination caps a page at 50 rows.
- Sortable header is a `<button>` filling the cell with `inline-flex items-center gap-1 hover:text-foreground`; icon `ArrowUpDown size-3.5 opacity-50` when unsorted, `ArrowUp`/`ArrowDown` in `text-foreground` when active; set `aria-sort` on the `th`. Click cycles asc -> desc -> none.
- Identity cell: 32px avatar + two lines (`text-sm font-medium` name as a link to the detail page, `text-xs text-muted-foreground` email), `min-w-0 truncate`. The name is the only link; the whole row is not clickable.
- Row actions: last column, `w-10`, a `MoreHorizontal` ghost `size-8` button (`aria-label="Actions for {name}"`) opening a menu: View, Edit, separator, Delete (`text-destructive`).
- Empty values render as an em dash in `text-muted-foreground`, never blank.
- **Mobile variant (<768):** render a `<ul className="space-y-3 md:hidden">` instead of the table (`hidden md:block` on the table). Each item `rounded-lg border bg-card p-4`: top row avatar + name/email + actions menu; below, a `mt-3 grid grid-cols-2 gap-x-4 gap-y-2` `<dl>` with `dt` `text-xs text-muted-foreground` and `dd` `text-sm`; badge sits under the name. Sorting on mobile is a "Sort" `Select` in the toolbar.

**6.4 Toolbar / filters** — `flex flex-col gap-3 lg:flex-row lg:items-center`.
- Search: `Input` with leading `Search size-4 text-muted-foreground` (`pl-9`), `w-full lg:w-72`, placeholder "Search by name or email", debounced 300ms, clear `X` button when non-empty.
- Filters: shadcn `Select`s `h-9 w-full sm:w-44` (Specialization, Hospital / Condition, Doctor, Gender) and a date-range `Popover` + `Calendar` button (`CalendarDays` icon, shows "1 Oct - 31 Oct 2026").
- Desktop: search left, filters inline, `ml-auto` for the Reset button. Tablet: search full-width on row 1, filters in a `grid grid-cols-2 gap-3` on row 2. Mobile: search + a "Filters" outline button with a count badge that opens a bottom `Sheet` containing the same controls stacked, with Apply / Reset in its footer.
- Active-filter chips: a row under the toolbar, shown only when any filter is set: `inline-flex h-6 items-center gap-1 rounded-md border bg-muted px-2 text-xs` reading "Specialization: Cardiology" with an `X` button (`aria-label="Remove filter Specialization: Cardiology"`), followed by a ghost `h-6 px-2 text-xs` "Clear all".
- Filter, sort, page and page-size state lives in URL search params so views are shareable and survive refresh. Changing any filter resets to page 1.

**6.5 Pagination** — `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground tabular-nums`.
Left: "Showing 21-40 of 128". Right: "Rows per page" `Select` (10 / 20 / 50, `h-8 w-[72px]`), then "Page 2 of 7", then four
`size-8` outline icon buttons (`ChevronsLeft`, `ChevronLeft`, `ChevronRight`, `ChevronsRight`) with aria-labels and `disabled` at the ends.
Mobile: hide first/last buttons and the "Page x of y" text. Hide the whole bar when total is 0.

**6.6 Badges** — base: `inline-flex h-5.5 items-center rounded-md px-2 text-xs font-medium ring-1 ring-inset whitespace-nowrap`.
Specialization and condition badges are coloured by a **deterministic hash of the lowercased label** into the 8 tints below, so
"Cardiology" is the same colour on every page and in both themes. Tints carry no meaning; red and green are deliberately excluded so no
condition looks "good" or "bad". Keep the class strings as full literals so Tailwind can see them.

```ts
export const BADGE_TINTS = [
  "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  "bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20",
  "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
  "bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/20",
  "bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
  "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-600/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-300 dark:ring-fuchsia-400/20",
  "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  "bg-lime-50 text-lime-800 ring-lime-600/20 dark:bg-lime-400/10 dark:text-lime-300 dark:ring-lime-400/20",
] as const;

export function badgeTint(label: string) {
  let h = 0;
  for (const ch of label.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BADGE_TINTS[h % BADGE_TINTS.length];
}
```

Text contrast on these tints is 6.8-9.5:1 in light and 7.7-10.9:1 in dark. Gender is plain text, not a badge. Status badges (if any)
use the semantic recipe `bg-success/10 text-success ring-success/20`. Badges are never clickable-looking and never ALL CAPS.

**6.7 Avatar initials** — `size-8` in tables, `size-9` in the header, `size-16` in detail headers; `rounded-full bg-accent text-accent-foreground font-medium`
with `text-xs` / `text-xs` / `text-xl`. Initials = first letter of first and last word, uppercase, ignoring titles ("Dr."). One colour for all
avatars (the badge carries the variety). Mark `aria-hidden="true"` when the name is printed next to it.

**6.8 Forms and dialogs**
- Desktop/tablet: shadcn `Dialog`, `sm:max-w-lg` (512px) for doctor/patient forms, `sm:max-w-md` (448px) for confirmations; `p-6`, `max-h-[85vh]` with the body scrolling and header/footer fixed. Mobile (<640): the same form in a bottom `Sheet` (`h-[92dvh] rounded-t-xl`), footer sticky with full-width buttons.
- Title `text-lg font-semibold` ("Add doctor" / "Edit patient"), description `text-sm text-muted-foreground`.
- Field: `<div className="grid gap-1.5">` label, control, help or error. Label `text-sm font-medium`; required marker `<span className="text-destructive" aria-hidden="true"> *</span>` plus `aria-required="true"` on the control (mark required, do not mark optional). Help `text-xs text-muted-foreground`. Error replaces help: `text-xs text-destructive` with `id` wired via `aria-describedby`, control gets `aria-invalid="true"` (shadcn styles it with `border-destructive ring-destructive/20`).
- Layout: single column; pair short fields on `sm+` with `grid sm:grid-cols-2 gap-4` (phone + hospital, age + gender). Doctor select in the patient form is a searchable `Combobox`.
- Validate on blur and on submit (react-hook-form + zod); on failed submit focus the first invalid field. Server field errors map to fields; a non-field error shows as an inline `Alert variant="destructive"` at the top of the form body.
- Footer: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` -> **Cancel (outline) on the left, primary on the right**; on mobile the primary is on top. Submit label is the verb ("Add doctor", "Save changes"); while pending it is disabled with a `Loader2 size-4 animate-spin` and the label stays. Closing a dirty form asks "Discard changes?".

**6.9 ConfirmationDialog** — shadcn `AlertDialog`, `sm:max-w-md`. Title is a question naming the record: "Delete Dr. Sara Khan?". Body states
the consequence in one or two sentences ("This permanently removes the doctor and unassigns their 14 patients. This cannot be undone.").
Buttons: Cancel (outline, receives initial focus), then **Delete** (`variant="destructive"`). No icon circle, no red header. While pending: spinner in the destructive button, both disabled, Escape blocked.

**6.10 EmptyState** — centred in the table/card area: `flex flex-col items-center justify-center gap-3 px-6 py-12 text-center`. Icon `size-10 rounded-lg bg-muted`
tile with a `size-5 text-muted-foreground` Lucide icon; title `text-sm font-medium`; description `text-sm text-muted-foreground max-w-sm`; one action.
Two variants: *no data yet* ("No doctors yet" / "Add your first doctor to start tracking patients." / primary "Add doctor") and *no results* ("No doctors match your filters" / outline "Clear filters"). No illustrations.

**6.11 ErrorState** — same box as EmptyState with `AlertTriangle` in `bg-destructive/10 text-destructive`, title "Couldn't load doctors", description is the
human-readable cause, outline "Try again" button calling refetch; `role="alert"`. Section-level errors stay inside their card (one failed chart must not
blank the dashboard). Route-level: `error.tsx` and `not-found.tsx` render it centred inside the shell with a "Back to dashboard" link.

**6.12 LoadingSkeleton** — shadcn `Skeleton` (`bg-muted animate-pulse rounded-md`), shaped exactly like the final layout so nothing shifts.
Table: real header + 8 rows of `h-12` each holding a `size-8 rounded-full` + `h-4 w-40` + `h-4 w-24` bars. StatCard: `h-3 w-24`, `h-7 w-16`, `h-3 w-28`.
Chart: one `h-[280px] w-full` block. Detail header: `size-16 rounded-full` + two bars. Use `loading.tsx` per route; on refetch keep the old rows at
`opacity-60` instead of flashing skeletons. Wrap in `aria-busy="true"` with a visually hidden "Loading".

**6.13 Toasts** — `sonner` (`<Toaster position="bottom-right" richColors={false} closeButton />`, top-centre on mobile). Card-styled: `bg-popover text-popover-foreground border shadow-lg rounded-lg`,
with a leading `size-4` icon coloured `text-success` (`CircleCheck`) or `text-destructive` (`CircleAlert`). Copy is past-tense and specific: "Doctor added", "Patient deleted",
"Couldn't delete patient. Try again." Success 4s, error 6s. One toast per action; never toast validation errors (those are inline).

**6.14 Charts** (Recharts inside shadcn `ChartContainer`)
- Card: `rounded-lg border bg-card p-4 md:p-5`; header = card title + `text-xs text-muted-foreground` subtitle on the left, controls on the right (day/week/month is a `ToggleGroup` `h-8` with `text-xs`, selected `bg-accent text-accent-foreground`).
- Heights: area/line `h-[280px]` (`h-[220px]` <768); horizontal bars `h-[280px]` with max 8 bars at `barSize={16}`; donut `h-[240px]`, `innerRadius="62%" outerRadius="88%"`, total count in the centre (stat-number style + caption).
- Grid: `<CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />` (for horizontal bars use `horizontal={false}`). Axes: `axisLine={false} tickLine={false} tickMargin={8}`, ticks `fontSize: 12, fill: "var(--muted-foreground)"`, tabular-nums; Y axis `width={32}`, `allowDecimals={false}`; at most 6 X ticks (`minTickGap={24}`).
- Area: `type="monotone" stroke="var(--chart-1)" strokeWidth={2}`, fill `var(--chart-1)` at `fillOpacity={0.12}` (flat, no gradient), no dots, `activeDot={{ r: 4 }}`. Bars: `fill="var(--chart-1)" radius={[0, 4, 4, 0]}` (vertical bars `[4, 4, 0, 0]`), value label at the bar end in `text-xs`.
- Tooltip: shadcn `ChartTooltipContent` = `rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md`, label in `font-medium`, each row a 8px colour square + name + right-aligned tabular value; cursor is `stroke: var(--border)` for lines, `fill: var(--muted)` at 0.5 for bars.
- Legend: below the chart (donut: to the right on `lg+`), `text-xs text-muted-foreground`, 8px `rounded-[2px]` swatch, shows value and percentage. No legend for single-series charts.
- Empty: keep the card and title, replace the plot with the EmptyState (`BarChart3` icon, "No data for this period"). Loading: skeleton block of the same height. Disable entrance animation under reduced motion (`isAnimationActive={!prefersReducedMotion}`), otherwise 300ms.
- Every chart has an `aria-label` summarising it ("Patient growth, last 30 days, 42 new patients") and its data is reachable as text (the tooltip values are mirrored in a visually hidden table or the adjacent list).

## 7. Page blueprints

**Login** — no shell. Centred column `min-h-dvh grid place-items-center bg-background px-4`; a single `w-full max-w-sm` card (`p-6`, border, no shadow).

```
        [logo tile] Doctor Tracker
   +--------------------------------+
   | Sign in                        |
   | Use your admin account.        |
   | Email      [________________]  |
   | Password   [____________ (eye)]|
   | [inline error alert if failed] |
   | [        Sign in           ]   |
   +--------------------------------+
     (c) 2026 Doctor Tracker · theme toggle
```

No split-screen hero, no illustration. Autofocus email, Enter submits, generic error "Incorrect email or password".

**Dashboard** — desktop is a 12-column grid, `gap-4 lg:gap-6`.

```
PageHeader: "Dashboard" + description      [date range v] [Add doctor]
[Stat: Doctors][Stat: Patients][Stat: Specializations][Stat: New this month]   4 x col-span-3
[Patient growth (area, day/week/month)        col-span-8][Condition donut  col-span-4]
[Patients per doctor (h-bars)   col-span-6][Doctors added over time (bars)  col-span-6]
[Specialization distribution col-span-4][Top doctors by patients col-span-4][Quick actions col-span-4]
[Recent doctors (5 rows)        col-span-6][Recent patients (5 rows)        col-span-6]
```

Tablet: stats 2x2, every chart row becomes 2 columns (growth chart full width). Mobile order (single column): header + date range,
stats (2x2), patient growth, quick actions, condition donut, patients per doctor, top doctors, recent patients, recent doctors,
doctors over time, specialization distribution. Recent lists are compact rows (avatar, name, secondary line, right-aligned date) with a "View all" link in the card header.
Top doctors is a ranked list: rank number, avatar, name, specialization badge, count + a thin `h-1.5 rounded-full bg-muted` bar with a `bg-primary` fill.
Quick actions: three outline buttons stacked (`Add doctor`, `Add patient`, `View all patients`), each `justify-start` with an icon. The date range applies to every time-based widget and is shown in each subtitle.

**Doctors list**

```
PageHeader: "Doctors" · "128 doctors"                                  [+ Add doctor]
[Search............] [Specialization v] [Hospital v] [Created: range]          [Reset]
(chips: Specialization: Cardiology x   Clear all)
+------------------------------------------------------------------------------+
| Doctor ^        | Specialization | Hospital | Phone | Patients | Created | ...|
| (SK) Sara Khan  | [Cardiology]   | City Gen | +880… |       14 | 12 Nov  | ...|
+------------------------------------------------------------------------------+
Showing 1-20 of 128                 Rows per page [20 v]  Page 1 of 7  |< < > >|
```

**Doctor detail**

```
Breadcrumb: Doctors / Dr. Sara Khan
+ Profile header card ---------------------------------------------------------+
| (SK 64px)  Dr. Sara Khan  [Cardiology]                      [Edit] [Delete] |
|            sara@hospital.org · City General                                  |
+------------------------------------------------------------------------------+
[Info card  lg:col-span-4]            [Patients card  lg:col-span-8]
 Email / Phone / Hospital /            "Patients (14)"            [+ Add patient]
 Specialization / Created / Updated    table: Name, Age/Gender, Condition, Contact, Created, [delete]
 (dl: dt caption, dd body)             own search + pagination; EmptyState "No patients assigned"
```

Mobile: header card (actions collapse into a `MoreHorizontal` menu), then info, then patients as stacked cards. Delete in the header is `variant="outline"` with `text-destructive`, not a solid red button.

**Patients list** — identical skeleton to Doctors list. Columns: Patient (name), Age / Gender ("34 · Female"), Condition (badge), Assigned doctor (link to doctor detail, avatar `size-6`),
Contact (phone), Created, actions. Filters: Condition, Doctor (combobox), Gender, Created range.

**Patient detail** — breadcrumb `Patients / Amir Ali`; header card (avatar, name, condition badge, "34 · Male", Edit / Delete); below, `grid gap-4 lg:grid-cols-3`:
"Patient information" `dl` card (`lg:col-span-2`: age, gender, condition, phone, email, address, created, updated) and "Assigned doctor" card (`lg:col-span-1`: avatar, name link,
specialization badge, hospital, phone, "View doctor" outline button).

## 8. Interaction and motion

- **Durations:** hover/press colour `transition-colors duration-150`; popover/dropdown/tooltip 150ms; dialog/sheet 200ms in, 150ms out; sidebar width 200ms; chart entrance 300ms. Easing `ease-out` for entering, `ease-in` for leaving (`cubic-bezier(0.16, 1, 0.3, 1)` for sheets). Nothing above 300ms; no bounce, no parallax, no hover scale/lift on cards.
- **Focus ring** (keyboard only): `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`. Inputs use shadcn's `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`. Never remove a ring without replacing it.
- **States:** hover = one step of background (`hover:bg-muted/50` rows, `hover:bg-primary/90` primary button); disabled = `opacity-50 pointer-events-none`; pending = spinner inside the control, layout width unchanged.
- **Keyboard:** Tab order follows visual order; a "Skip to content" link is the first focusable element; `/` focuses the list search; `Ctrl/Cmd+B` toggles the sidebar; Escape closes the topmost overlay; Enter submits forms; arrow keys move within menus, selects, toggle groups and the calendar; focus is trapped in dialogs and returns to the trigger on close (to the row's action button after a delete is cancelled, to the table heading after it succeeds).
- **Navigation:** use `next/link` (prefetch) everywhere; route changes show `loading.tsx` skeletons, never a full-page spinner; scroll resets to top on page change, preserved on filter change.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, remove transforms and chart animation, keep opacity fades at <=100ms, and stop `animate-pulse`/`animate-spin` loops from being the only pending signal (text "Loading" remains). Use Tailwind's `motion-reduce:` variants.
- **Theme switch:** set `disableTransitionOnChange` on `ThemeProvider` so colours do not animate across the page.

## 9. Accessibility checklist

- [ ] One `<h1>` per page (PageHeader); headings do not skip levels; landmarks `<header>`, `<nav aria-label="Main">`, `<main id="main">`.
- [ ] All text meets 4.5:1 and UI graphics 3:1 in both themes using only the tokens above; no raw hex or ad-hoc Tailwind greys for text.
- [ ] Every input has a visible `<label htmlFor>`; errors are linked with `aria-describedby` and announced; required fields have `aria-required`.
- [ ] Every icon-only button has an `aria-label` and a tooltip; decorative icons are `aria-hidden`.
- [ ] Tables use real `<table>`, `<th scope="col">`, `aria-sort`; the mobile card list uses `<ul>` + `<dl>` with the same data.
- [ ] Colour is never the only signal: badges have text, deltas have a sign and arrow, charts have legends/labels, errors have an icon and text.
- [ ] Dialogs, sheets, menus, selects and comboboxes are the shadcn/Radix primitives (focus trap, Escape, `aria-modal`, return focus) and each dialog has a title and description.
- [ ] Toasts are announced (`aria-live` via sonner) and are never the only place an error appears for a form.
- [ ] Hit targets are at least 44x44px on touch viewports and 32x32px on desktop; 8px minimum between adjacent targets.
- [ ] Works at 320px width and at 200% zoom with no horizontal scroll and no clipped content.
- [ ] Full flows (log in, add/edit/delete doctor and patient, filter, paginate, switch theme) are completable by keyboard alone with a visible focus ring.
- [ ] `<html lang="en">`; each route sets a descriptive `<title>` ("Doctors · Doctor Tracker"); loading regions use `aria-busy`; reduced motion is honoured.

## 10. Do / Don't

| Do | Don't |
|---|---|
| Use tokens (`bg-card`, `text-muted-foreground`, `var(--chart-1)`) | Hard-code hex, or use `gray-*`/`zinc-*` utilities for surfaces and text |
| Keep cards flat with a 1px border | Add shadows, gradients, glass/blur or glow to cards |
| One teal primary button per view | Colour stat cards, avatars or nav items individually |
| `rounded-lg` cards, `rounded-md` controls | `rounded-2xl`/`rounded-3xl` or pill-shaped cards and buttons |
| Cap headings at 24px, body at 14px | Hero-sized titles, large welcome banners, decorative illustrations |
| Single-hue bars; top 5 + "Other" for donuts | Rainbow bar charts, 3D, pie charts with more than 6 slices |
| Tabular, right-aligned numbers; consistent date format | Mixed date formats, centred numeric columns |
| Design every loading, empty and error state | Blank areas, full-page spinners, raw error objects or stack traces |
| Stack tables into cards under 768px | Horizontally scrolling tables on mobile |
| Confirm every delete, naming the record | Primary-coloured or unconfirmed destructive actions |
| Sentence-case labels and verb-first buttons ("Add doctor") | ALL-CAPS headers, "Submit"/"OK" buttons, emoji in the UI |
