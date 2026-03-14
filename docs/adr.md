# Runalyzer — Decisiones de Arquitectura (ADRs)

> Los ADRs (Architecture Decision Records) documentan **por qué** se tomaron las decisiones técnicas, no solo qué se decidió. Son la memoria del proyecto.

---

## ADR-001: Zustand sobre Redux para estado global

**Fecha**: 2025  
**Estado**: Activo

### Contexto
Runalyzer necesita estado global para credenciales, actividades y configuración del usuario. Las opciones evaluadas fueron Redux Toolkit, Zustand y Context API.

### Decisión
Se eligió **Zustand 5**.

### Razones
- API minimalista sin boilerplate (no hay slices, reducers, ni actions)
- Soporte nativo de persistencia con `zustand/middleware` (persist) — crítico para guardar credenciales en localStorage
- Compatible con React 19 y sus patrones de suspense
- Tamaño bundle insignificante (~1kb)
- Suficiente para la escala de este proyecto

### Consecuencias
- El estado es más difícil de trazar en debug que Redux DevTools (aunque Zustand tiene su propio devtools)
- No hay un patrón forzado de inmutabilidad — requiere disciplina del desarrollador

---

## ADR-002: Recharts sobre Victory, Chart.js o D3 directo

**Fecha**: 2025  
**Estado**: Activo

### Contexto
Se necesitan gráficos específicos: serie temporal de FC, barras de distribución de zonas, comparativas. Opciones evaluadas: D3 directo, Chart.js, Victory, Recharts.

### Decisión
Se eligió **Recharts 3**.

### Razones
- Construido sobre D3 pero con API declarativa de React — no hay manipulación directa del DOM
- Composición por componentes (`<LineChart>`, `<XAxis>`, etc.) es natural en React
- Soporte de responsividad con `<ResponsiveContainer>`
- Tipado TypeScript de primera clase
- Customizable sin llegar a la complejidad de D3 puro

### Consecuencias
- Menos flexibilidad que D3 para visualizaciones muy custom
- La API de Recharts puede ser verbose para gráficos complejos

---

## ADR-003: Vertical Slice Architecture sobre arquitectura en capas

**Fecha**: 2026-03-14  
**Estado**: Activo (reemplaza la arquitectura de 4 capas horizontal)

### Contexto
El proyecto empezó con una arquitectura horizontal de 4 capas (`api / domain / application / presentation`). Al crecer, esta estructura genera un problema: para agregar una feature nueva hay que tocar 4 carpetas distintas. El código relacionado está disperso en lugar de cohesivo.

### Decisión
Se adoptó **Vertical Slice Architecture** con TanStack Router:
- `app/` — bootstrap y root route (providers, instancia del router)
- `features/` — una carpeta por feature, cada una autónoma con su routing, domain, components, hooks y repository
- `shared/` — solo lo que usan 2 o más features

### Razones
- Cada feature es un módulo cohesivo: para entender "actividades" solo mirás `features/activity/`
- Escala mejor: agregar una feature nueva no toca código existente
- TanStack Router encaja perfectamente — cada feature define sus propias rutas en `features/*/routes/*.route.tsx`
- La lógica de dominio sigue siendo pura y testeable (vive en `features/*/domain/`)

### Consecuencias
- Requiere disciplina en la **Scope Rule**: no mover código a `shared/` prematuramente
- Las rutas (`.route.tsx`) son thin: solo conectan el router con los componentes de la feature, no tienen lógica de negocio
- **Regla que no se puede romper**: `features/*/domain/` es código puro sin imports de React ni de la API

---

## ADR-007: TanStack Router sobre React Router

**Fecha**: 2026-03-14  
**Estado**: Activo

### Contexto
El proyecto arrancó con React Router v7. Al adoptar Vertical Slice Architecture, se evaluó qué router encajaba mejor con el patrón de `*.route.tsx` por feature.

### Decisión
Se migra a **TanStack Router 1.x**.

### Razones
- **Type-safety de extremo a extremo**: las rutas, params y search params son completamente tipados — no hay `useParams()` que devuelva `string | undefined` sin control
- Integración nativa con **TanStack Query**: los loaders de ruta pueden pre-fetchear datos antes de renderizar
- El patrón `*.route.tsx` por feature encaja perfectamente con Vertical Slice — cada feature es dueña de sus rutas
- Devtools excelentes para debugging de navegación

### Consecuencias
- Curva de aprendizaje mayor que React Router — la configuración inicial es más verbosa
- Los archivos `__root.tsx` y la configuración del router viven en `app/bootstrap/` para no contaminar las features
- **Regla**: cada feature define sus rutas en `features/*/routes/*.route.tsx` y las registra en el router global

---

## ADR-004: Tailwind CSS 4 sobre CSS Modules o styled-components

**Fecha**: 2025  
**Estado**: Activo

### Contexto
Se necesita un sistema de estilos que permita construir rápido una UI dark mode con alta consistencia visual.

### Decisión
Se eligió **Tailwind CSS 4**.

### Razones
- Utilidades inline = menos context-switching entre archivos
- El tema oscuro con acentos personalizados (naranja) se configura una vez en CSS custom properties
- Tailwind v4 usa CSS nativo (sin PostCSS para la configuración core) — más simple
- Co-localización de estilos con el componente sin necesitar CSS Modules

### Consecuencias
- JSX más verboso con clases largas
- Requiere conocer las clases de Tailwind — curva inicial
- Sin `cn()` (clsx + tailwind-merge) el manejo de clases condicionales se vuelve feo — se usa `lib/` para esta utilidad

---

## ADR-005: TanStack Query para server state

**Fecha**: 2025  
**Estado**: Activo

### Contexto
Las llamadas a intervals.icu necesitan caché, loading states, error handling y re-fetch. Manejar esto manualmente con `useEffect` es propenso a bugs (race conditions, stale data, etc.).

### Decisión
Se eligió **TanStack Query 5** para gestionar el "server state" (datos que vienen de la API).

### Razones
- Separación clara entre server state (TanStack Query) y client state (Zustand)
- Cache automático con stale-while-revalidate
- Loading/error states de primera clase
- Devtools excelentes para debugging

### Consecuencias
- Dos sistemas de estado coexisten (Zustand + TanStack Query) — requiere entender cuándo usar cada uno
- **Regla**: datos de la API → TanStack Query. Datos del usuario (credenciales, config) → Zustand.

---

## ADR-006: Modelo de 3 zonas (no 5, no 7)

**Fecha**: 2025  
**Estado**: Activo — **No negociable**

### Contexto
Los sistemas de zonas más populares (Garmin, Polar) usan 5 o 7 zonas. La mayoría de apps de running las replican.

### Decisión
Runalyzer usa **exactamente 3 zonas** basadas en los dos umbrales fisiológicos reales.

### Razones
- La metodología de Luis del Águila (base del proyecto) trabaja con 3 zonas
- Las zonas 4 y 5 de Garmin son subdivisiones arbitrarias sin base fisiológica real para corredores amateurs
- Con 3 zonas el feedback es más claro: "corriste 80% en Z2" tiene significado concreto
- El cardiac drift solo tiene sentido en Z2 — más zonas complejizarían el análisis sin valor

### Consecuencias
- Los usuarios que vienen de Garmin/Strava van a preguntar "¿dónde está la zona 4?"
- La app debe explicar el modelo cuando el usuario lo configura por primera vez
- **Bajo ningún concepto se agrega soporte para 5 o 7 zonas** — rompe la coherencia metodológica
