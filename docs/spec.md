# Runalyzer — Especificación de Producto

> **Versión**: 1.0  
> **Fecha**: 2026-03-14  
> **Estado**: En desarrollo activo

---

## Visión

Runalyzer es una herramienta de análisis post-entrenamiento para runners amateurs que usan intervals.icu. Su objetivo es traducir los datos crudos de cada sesión en **feedback concreto y accionable** basado en la metodología del entrenador Luis del Águila, sin necesitar un coach humano.

---

## Problema que resuelve

Los runners amateurs que entrenan solos tienen acceso a datos (Garmin, Polar, COROS → intervals.icu) pero **no saben interpretarlos**. Conocen su ritmo y distancia, pero no entienden:

- Si entrenaron en la zona correcta
- Si el esfuerzo fue sostenible o acumularon fatiga oculta
- Si el sistema cardiovascular respondió bien o hay señales de alarma
- Cómo cuantificar la carga interna vs la externa

---

## Usuario objetivo

- Runner amateur que corre **30–60 km/semana**
- Usa un **reloj GPS con sensor de frecuencia cardíaca**
- Registra sus actividades en **intervals.icu**
- **No tiene coach** y busca mejorar de forma autónoma
- Tiene **presupuesto ajustado** (no paga un entrenador profesional)

---

## Conceptos del dominio

Estos conceptos son fundamentales. Toda IA que trabaje en este proyecto DEBE entenderlos:

### Modelo de 3 Zonas (NO 5, NO 7)

La app usa exactamente 3 zonas de frecuencia cardíaca. No el modelo de 5 zonas de Garmin ni el de 7 de Polar.

| Zona | Nombre | Descripción |
|------|--------|-------------|
| Z1 | Recuperación/Base | Por debajo del umbral aeróbico |
| Z2 | Aeróbico | Entre umbral aeróbico y umbral anaeróbico |
| Z3 | Alta Intensidad | Por encima del umbral anaeróbico |

Estas zonas se definen a partir de un Test de Umbrales que consiste en un 4x2km aumentando el ritmo en cada serie, donde la ultima o penultima tiene que ser en torno al ritmo de una competicion de media maraton. En el momento en el que se rompa el plateau que se debe ver en todas las series anteriores, ese sera el ritmo de umbral y se determinara su ritmo de entrenamientos de la siguiente manera:

- El ritmo de entrenamientos sera el ritmo al que se rompio la homeostasis + 10-15 segundos.
- El pulso maximo al que debera llegar el corredor en los entrenamientos a umbral sera en el que se rompio esa homeostasis.
- El ritmo de rodaje debera ser en torno a + 1'15" mas lento que el ritmo de entrenamientos a umbral.

IMPORTANTE: si el usuario ya conoce sus umbrales porque se ha hecho un test con anterioridad, puede indicarlo cuando se registra y podra modificarlos en cualquier momento en su perfil.

### Cardiac Drift

El cardiac drift es el incremento progresivo de la FC manteniendo el mismo ritmo de carrera. Es un indicador de fatiga, deshidratación o sobreesfuerzo.

- **Alerta**: drift > 4% en entrenamientos Z2
- Se calcula comparando la FC promedio de la primera mitad vs la segunda mitad del entrenamiento
- **Sin FC → no hay análisis posible**

Este cardiac drift se calculara de forma distinta en los ritmos a umbral. Cuando haya un entrenamiento en el que se este durante mas de 15 minutos en la zona entre umbrales, se calculara solamente para ese tramo en el que se este en esa zona de FC. En el resto del entrenamiento no sera relevante.

### Carga Interna vs Carga Externa

- **Carga externa**: lo que el mundo ve (distancia, ritmo, desnivel)
- **Carga interna**: el costo fisiológico real (FC, RPE)
- La app compara ambas para detectar si el esfuerzo fue proporcional al trabajo realizado

### Lactate Clearance

Ventana de **3 minutos** al final del entrenamiento donde el runner debe trotar suave para facilitar la eliminación de lactato. La app detecta si el runner hizo una bajada gradual o cortó abruptamente.

Solamente se tendra en cuenta para la vuelta que se produzca en el entrenamiento justo despues de los bloques de entrenamientos a umbral. Para los entrenamientos en z1 no se tendra en cuenta. Se mostrara en la aplicacion cual ha sido la FC de recuperacion y en cuanto tiempo se ha estabilizado.

### RPE (Perceived Exertion)

Escala del **1 al 10**. El runner registra su percepción subjetiva del esfuerzo. Se usa para validar o contrastar con los datos objetivos de FC.

---

## Features del sistema

### ✅ Implementadas (v1)

| Feature | Descripción |
|---------|-------------|
| Autenticación por API key | Conexión con intervals.icu usando athlete ID + API key |
| Persistencia de sesión | Las credenciales persisten entre sesiones (localStorage via Zustand) |
| Listado de actividades | Dashboard con actividades recientes desde intervals.icu |
| Vista de detalle | Análisis completo de una actividad individual |
| Análisis Cardiac Drift | Cálculo y visualización del drift por mitades |
| Distribución por zonas | Gráfico de tiempo en Z1/Z2/Z3 |
| Carga Interna vs Externa | Comparación de métricas objetivas y subjetivas |
| Lactate Clearance | Detección de bajada gradual al final del entreno |
| Registro de RPE | Input manual del esfuerzo percibido post-entreno |
| Registro de lesiones | Formulario para documentar molestias o lesiones |
| Feedback accionable | Resumen textual con recomendaciones concretas |

### 🔲 Pendientes (próximas versiones)

| Feature | Descripción |
|---------|-------------|
| Test de umbrales | Detección del punto de ruptura de cardiac drift desde intervals.icu para calibrar zonas automáticamente |
| Historial de RPE/lesiones | Vista temporal de RPE y lesiones registradas |
| Tendencias semanales | Evolución de carga y cardiac drift semana a semana |
| Configuración de zonas avanzada | Ajuste manual de los umbrales de zona |

---

## Requerimientos no-funcionales

- **Sin FC = sin análisis**: si una actividad no tiene datos de frecuencia cardíaca, no se puede analizar. La app debe comunicarlo claramente.
- **Offline-first de credenciales**: las credenciales persisten localmente. No hay backend propio.
- **UX clara sobre datos faltantes**: cuando faltan datos (FC, stream de actividad), la UI debe explicar por qué no hay análisis, no mostrar errores técnicos.
- **Performance**: el análisis se hace en el cliente (no hay servidor de cómputo). Los cálculos deben ser eficientes.
- **Metodología consistente**: cualquier nuevo análisis implementado debe respetar los conceptos del dominio definidos arriba. No improvisar fórmulas.

---

## Fuera de scope (explícito)

Esto NO es Runalyzer y NUNCA lo será en v1:

- ❌ Guía en tiempo real durante el entrenamiento
- ❌ Planificación de semanas o ciclos de entrenamiento
- ❌ Features sociales (comparar con otros, rankings)
- ❌ Nutrición, suplementación, descanso
- ❌ Entrenamiento de fuerza
- ❌ Ciclismo, natación u otros deportes
- ❌ Integración directa con Garmin Connect o Strava (solo vía intervals.icu)
- ❌ Backend propio o base de datos en servidor
