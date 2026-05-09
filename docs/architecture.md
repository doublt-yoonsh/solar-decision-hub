# Architecture - Solar Decision Hub

## Module Dependency Graph

```
┌──────────────────────────────────────────────┐
│  /app  (Next.js App Router)                  │
│   landing → wizard → result → pdf / docs     │
└──────────────────┬───────────────────────────┘
                   │ uses
                   ▼
┌──────────────────────────────────────────────┐
│  /components                                 │
│   wizard/  result/  ui/(shadcn)              │
└──────────────────┬───────────────────────────┘
                   │ calls
                   ▼
┌──────────────────────────────────────────────┐
│  /lib (analysis layer)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │benchmark │ │simulator │ │  portfolio   │  │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       │            │              │          │
│       ▼            ▼              ▼          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ defaults │ │ location │ │   shared     │  │
│  │          │ │ (network)│ │ (npv/irr)    │  │
│  └────┬─────┘ └────┬─────┘ └──────────────┘  │
│       │            │                         │
│       ▼            │                         │
│  ┌──────────┐      │                         │
│  │  data    │ ◄────┘ (cached lookups)        │
│  │ static   │                                │
│  └──────────┘                                │
│                                              │
│  /lib/types  (depended-on by ALL above)      │
└──────────────────────────────────────────────┘
```

## Module Responsibilities

| Module | Responsibility | Pure? |
|---|---|---|
| `lib/types` | Shared TS types and enums | yes |
| `lib/data` | Static JSON loaders + meta headers | yes |
| `lib/defaults` | Smart defaults (region/site/weight/finance) | yes |
| `lib/shared` | NPV, IRR, finance utilities, chart helpers | yes |
| `lib/location` | Kakao / PVGIS / VWorld API wrappers | no (network) |
| `lib/benchmark` | Benchmarking analysis | yes |
| `lib/simulator` | 4-scenario revenue simulation | yes |
| `lib/portfolio` | Portfolio risk metrics | yes |

## Dependency Rules
- Lower-level modules MUST NOT import upper-level modules.
- `lib/types` is purely declarative (no runtime deps).
- All `lib/location` calls MUST have a fallback path (see data-sources.md).
- Static data is loaded via Next.js synchronous JSON import at build time.
- Each analysis module is independently testable with fixture inputs.

## Data Flow
1. `app/wizard/` collects `PlantInput`.
2. `lib/location/` enriches `PlantLocation` (address → coords → land use → substation).
3. `lib/defaults/` fills missing `PlantInput` fields based on region/site type.
4. `lib/benchmark`, `lib/simulator`, `lib/portfolio` each consume the enriched input and produce results in parallel.
5. `app/result/` aggregates and renders cards/charts.
6. `app/pdf/` renders the same data via `@react-pdf/renderer`.

## State Management
- `zustand` store holds the current wizard draft + computed results.
- Server state is unnecessary (no backend) — data is static + client-side compute.
- PDF page reads results from URL params + store; offline-friendly.

## File Naming Conventions
- Module entry: `lib/{module}/index.ts`
- Module types: `lib/{module}/types.ts`
- Internal helpers: `lib/{module}/_*.ts` (underscore prefix = internal)
- React components: PascalCase, one per file
