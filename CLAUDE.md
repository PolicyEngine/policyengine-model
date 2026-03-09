# PolicyEngine Model Overview

Standalone Vite+React+TS site explaining how PolicyEngine's microsimulation model works.
Deployed to Vercel as `policyengine-model`, embedded in policyengine-app-v2 at `/{countryId}/model`.

## Stack
- Vite 7 + React 19 + TypeScript
- Tailwind CSS v4 with `tw:` prefix + `@policyengine/design-system` tokens
- framer-motion for animations
- recharts for data visualizations
- Vitest + React Testing Library for tests

## Routing
- Hash-based routing (`#/rules/coverage`, `#/data/pipeline`, etc.)
- No react-router — custom `useHashRoute()` hook in `src/router.ts`
- Query params preserved: `?embed=true&country=us`

## Nav structure
```
Overview                          (#/)
Rules                             (expandable)
  Coverage tracker                (#/rules/coverage)
  Parameters                      (#/rules/parameters)
  Variables                       (#/rules/variables)
Data                              (expandable)
  Pipeline                        (#/data/pipeline)
  Calibration                     (#/data/calibration)
  Validation                      (#/data/validation)
Behavioral responses              (#/behavioral)
```

## Structure
- `src/router.ts` - Hash routing hook + navigate function
- `src/components/layout/` - AppShell, Sidebar, MobileHeader, Footer, SectionContainer
- `src/pages/` - Page components for each route
- `src/components/` - microsim/, rules/, data/, theory/ (existing components)
- `src/designTokens/` - Local design tokens (colors, typography, spacing) — kept for dynamic/conditional styles
- `src/data/` - Programs data, microsim steps, pipeline stages, elasticities
- `src/hooks/` - useInView
- `src/test/` - Vitest test files

## Styling approach
- Static layout → Tailwind classes with `tw:` prefix
- Dynamic/conditional styles → inline `style={}` using designTokens JS imports
- framer-motion style props → inline (required by motion API)
- recharts color props → designTokens JS imports
- PE design-system CSS vars available as `tw:text-pe-primary-500`, `tw:bg-pe-gray-50`, etc.

## Commands
- `bun dev` - Development server
- `bun run build` - Production build (includes tsc type checking)
- `bun run preview` - Preview production build
- `bun run test` - Run tests (Vitest)
- `bun run test:watch` - Run tests in watch mode

## Key URL params
- `?embed=true` - Hides sidebar, content full-width (for iframe embedding)
- `?country=us|uk` - Switches country data, spelling, currency
