# Runalyzer — Arquitectura Técnica

> **Versión**: 1.0  
> **Fecha**: 2026-03-14

---

## Stack

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Tipado estático |
| Vite | 8.x | Build tool / dev server |
| TanStack Router | 1.x | Routing type-safe para SPA |
| Zustand | 5.x | Client state (credenciales, config) |
| TanStack Query | 5.x | Server state / cache de API |
| Recharts | 3.x | Gráficos de análisis |
| Tailwind CSS | 4.x | Estilos utilitarios |
| intervals-icu | 2.2.1 | Cliente oficial de intervals.icu API |
| Axios | 1.x | HTTP client |
| Vitest | 4.x | Testing unitario |
| Testing Library | 16.x | Testing de componentes |

---

## Vertical Slice Architecture

El proyecto usa **Vertical Slice Architecture** con TanStack Router. Cada feature es autónoma y lleva su propio código junto — routing, componentes, lógica de negocio y acceso a datos.

Reglas de scope:
- Código usado por **1 feature** → queda dentro de la feature
- Código usado por **2+ features** → se mueve a `shared/`
- No sobre-ingeniería: simple, claro y mantenible

## Estructura de carpetas

```
src/
  app/                              ← Bootstrap de la aplicación
    bootstrap/
      providers.tsx                 ← QueryClient, Zustand, tema
      router.tsx                    ← Instancia del TanStack Router
    routes/
      __root.tsx                    ← Root route (layout global)
      index.tsx                     ← Ruta / (Dashboard)

  features/                         ← Vertical slices por feature
    activity/                       ← Todo lo relacionado con actividades
      routes/
        activity.route.tsx          ← Ruta /activity/$id (TanStack Router)
      components/                   ← Componentes exclusivos de esta feature
        ActivityCard.tsx
        ActivityCharts.tsx
        CardiacDriftChart.tsx
        ZoneDistributionBar.tsx
        ActionableFeedback.tsx
      hooks/                        ← Hooks exclusivos de esta feature
        useActivityDetail.ts
        useActivities.ts
      domain/                       ← Lógica de negocio pura (sin React)
        cardiacDrift.ts
        zoneDistribution.ts
        internalExternalLoad.ts
        lactateClearance.ts
        feedbackGenerator.ts
        types.ts
      repository/                   ← Acceso a datos (intervals.icu API)
        activity.repository.ts
    setup/                          ← Feature de configuración inicial
      routes/
        setup.route.tsx             ← Ruta /setup
      components/
        ZoneCalibration.tsx
        ApiKeyForm.tsx
      domain/
        zoneCalculator.ts
        types.ts
    rpe/                            ← Feature de RPE y lesiones
      components/
        RPEInput.tsx
        InjuryForm.tsx

  shared/                           ← Código usado por 2+ features
    api/
      intervals-client.ts           ← Cliente intervals-icu configurado
    store/                          ← Zustand stores (solo client state)
      auth.store.ts                 ← Credenciales (persistido en localStorage)
      zones.store.ts                ← Config de zonas (persistido en localStorage)
      rpe.store.ts                  ← Historial RPE/lesiones (persistido)
    components/                     ← Componentes UI reutilizables
    lib/
      cn.ts                         ← Utilidad clsx + tailwind-merge
```

---

## Flujo de datos

```
intervals.icu API
      ↓
  feature/*/repository/*.ts          ← Acceso a datos (abstrae intervals-icu)
      ↓
  TanStack Query (hooks)             ← Caché, loading states, re-fetch
      ↓
  feature/*/domain/*.ts              ← Cálculos puros (cardiac drift, zonas, etc.)
      ↓
  feature/*/components/*.tsx         ← Renderiza resultados
      ↓
  shared/store/* (Zustand)           ← Solo estado del usuario (credenciales, config)
```

---

## Estado global (Zustand stores)

Zustand gestiona **únicamente client state** — datos del usuario que persisten entre sesiones. Los datos que vienen de la API son responsabilidad de TanStack Query, no de Zustand.

| Store | Contenido | Persistido |
|-------|-----------|-----------|
| `auth` | athleteId, apiKey, maxHeartRate | ✅ localStorage |
| `zones` | Configuración Z1/Z2/Z3 del usuario | ✅ localStorage |
| `rpe` | Historial de RPE y lesiones | ✅ localStorage |

> ⚠️ **No usar Zustand para**: lista de actividades, detalle de actividad, ni cualquier dato de la API. Eso lo maneja TanStack Query con su caché propio.

---

## Diseño visual

- **Modo**: Dark mode exclusivo
- **Paleta**: Fondo oscuro (#0a0a0a aprox.) + acentos **naranja** (#f97316) + efectos glow
- **Estética**: Futurista / dashboard de alto rendimiento
- **Tipografía**: Monoespaciada para métricas, sans-serif para texto

---

## Testing

- **Framework**: Vitest + Testing Library + jsdom
- **Cobertura prioritaria**: capa `domain/analysis/` (lógica pura, sin UI)
- **Tests existentes**: `src/domain/analysis/__tests__/`
- **Patrón**: los tests del dominio no deben usar mocks de React ni del DOM

---

## Convenciones de código

- **Naming**: camelCase para variables/funciones, PascalCase para componentes y tipos
- **Exports**: cada capa tiene un `index.ts` que re-exporta todo (barrel exports)
- **Tipos**: todos los tipos de dominio viven en `domain/*/types.ts`
- **No hay any**: TypeScript en modo estricto, sin `any` explícito
- **Componentes**: funcionales con arrow functions, sin class components
