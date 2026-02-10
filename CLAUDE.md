# PolicyEngine Model Overview

Standalone Vite+React+TS site explaining how PolicyEngine's microsimulation model works.
Deployed to Vercel as `policyengine-model`, embedded in policyengine-app-v2 at `/{countryId}/model`.

## Stack
- Vite 6 + React 19 + TypeScript
- framer-motion for animations
- recharts for data visualizations
- Inline styles with design tokens (no CSS framework)

## Structure
- `src/designTokens/` - Colors, typography, spacing from PE design system
- `src/data/` - Programs data (from coverage-tracker), microsim steps, pipeline stages, elasticities
- `src/components/` - layout/, microsim/, rules/, data/, theory/
- `src/hooks/` - useScrollSpy, useInView

## Commands
- `bun dev` - Development server
- `bun run build` - Production build
- `bun run preview` - Preview production build
