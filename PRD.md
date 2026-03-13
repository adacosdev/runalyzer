# PRD — Runalyzer
**Versión:** 1.0  
**Fecha:** 2026-03-12  
**Estado:** Draft  

---

## 1. Problema

Los runners amateurs con base de entrenamiento (30–60 km/semana) no tienen acceso a un coach personal. Después de cada entrenamiento, no saben si lo que hicieron fue bien ejecutado ni qué ajustar para la próxima sesión. Las apps existentes (Garmin Connect, Strava) muestran datos crudos sin interpretarlos bajo ningún marco metodológico. El resultado es frustración, entrenamiento ineficiente y abandono por lesiones o estancamiento.

**El dolor concreto:** "Hice el entreno, pero no sé si lo hice bien. No sé si mi cuerpo respondió como debería. No sé qué cambiar la próxima vez."

---

## 2. Usuario Objetivo

**Perfil primario (v1):**
- Runner amateur con base de entrenamiento (30–60 km/semana)
- Objetivo de mejora de rendimiento (10k, media maratón)
- Sin acceso a coach personal
- Presupuesto ajustado — no paga por servicios de análisis
- Usa reloj GPS con sensor de FC (Garmin, Polar, COROS, etc.)
- Usa o está dispuesto a usar Intervals.icu para sincronizar actividades

**Lo que NO es este usuario:**
- Corredor de élite con soporte técnico profesional
- Principiante absoluto (menos de 3 meses corriendo)
- Usuario que busca funcionalidad social o competitiva

---

## 3. Solución

**Runalyzer** es una app web (v1) que analiza cada entrenamiento de running bajo la metodología de Luis del Águila, importando los datos desde Intervals.icu. En lugar de mostrar datos crudos, interpreta la sesión y le dice al usuario en lenguaje claro qué pasó en su cuerpo, si el entrenamiento fue bien ejecutado y qué ajustar la próxima vez.

**Propuesta de valor en una frase:**  
*"Tu coach de bolsillo que analiza cada entreno con criterio metodológico real, no con métricas genéricas de app comercial."*

---

## 4. Marco Metodológico — Luis del Águila

Toda la lógica de análisis de Runalyzer se basa en los principios de Luis del Águila. Esto es lo que diferencia el producto de cualquier app existente.

### 4.1 Filosofía base
- **Mínima intensidad necesaria:** el rendimiento se logra con la intensidad justa para generar adaptación, no con el máximo esfuerzo posible.
- **Continuidad sobre intensidad:** la consistencia semana a semana es el principal motor de progreso.
- **Primero no lesionarse:** cualquier señal de fatiga excesiva o mala ejecución debe generar una alerta clara.

### 4.2 Conceptos que la app debe medir y comunicar

| Concepto | Qué mide | Cómo lo interpreta la app |
|---|---|---|
| **Homeostasis Metabólica / Cardiac Drift** | Estabilidad del pulso durante esfuerzo a ritmo constante | Alerta si el pulso sube >5–8 ppm o >4% durante la sesión. Indica que el ritmo fue demasiado alto para el estado del cuerpo ese día |
| **Modelo de 3 Zonas** | Distribución del tiempo en zonas metabólicas | Z1 (Grasas/rodaje suave), Z2 (Glucógeno-Lactato/umbral), Z3 (VO2Max). NO usar modelos de 5 o 7 zonas |
| **Carga Interna vs. Externa** | Relación entre ritmo (min/km) y respuesta del cuerpo (FC + RPE) | El éxito de la sesión no se mide solo por el ritmo, sino por cómo respondió el cuerpo a ese ritmo |
| **Lactate Clearance / Lanzadera de Lactato** | Velocidad de recuperación del pulso entre series (ventana de 3 min) | Una caída rápida del pulso en los 3 min de pauta indica buena capacidad de reciclaje del lactato |
| **RPE (Esfuerzo Percibido)** | Sensación subjetiva del esfuerzo registrada post-entreno | Se cruza con los datos objetivos (FC, ritmo) para validar coherencia interna de la sesión |

---

## 5. Funcionalidades — v1

### 5.1 Integración con Intervals.icu
- Conexión mediante API key de Intervals.icu (autenticación del usuario)
- Importación automática de actividades de running
- Sincronización de datos: ritmo, FC, splits por intervalo, tiempo de recuperación
- La app NO reemplaza a Intervals.icu — lo usa como fuente de datos

### 5.2 Análisis post-entreno
El núcleo del producto. Para cada actividad importada, la app genera:

- **Resumen de ejecución:** ¿El entrenamiento se ejecutó como debería? (Bien / Con desviaciones / Mal ejecutado)
- **Análisis de Cardiac Drift:** gráfico y veredicto claro sobre estabilidad del pulso
- **Distribución en 3 Zonas:** tiempo real en cada zona metabólica vs. objetivo de la sesión
- **Carga Interna vs. Externa:** cruce de ritmo + FC para cada intervalo o fase
- **Lactate Clearance:** análisis de recuperaciones de 3 min entre series (cuando aplica)
- **Feedback accionable:** 1–3 recomendaciones concretas para el próximo entreno similiar

### 5.3 Registro de RPE
- Input manual post-entreno (escala 1–10 con descripción contextual para runners)
- El RPE se incorpora al análisis como variable de carga interna
- Histórico de RPE por tipo de sesión para detectar tendencias de fatiga

### 5.4 Seguimiento de lesiones y molestias
- Registro manual de molestias por zona corporal (rodilla, cadera, tobillo, etc.)
- Nivel de intensidad (leve / moderado / severo)
- Correlación visual con la carga de entrenamiento reciente
- Alerta si se detecta patrón de molestia recurrente en zona específica

### 5.5 Plataforma
- **v1:** Aplicación web (React + TypeScript) — diseño responsive, orientado a consulta rápida post-entreno
- **v2 (futuro):** App móvil nativa si la validación del producto lo justifica
- El análisis debe poder leerse en 2 minutos después de terminar de correr

---

## 6. Fuera de Scope — v1

| Feature | Razón |
|---|---|
| Guía de ritmo/FC en tiempo real | Lo resuelve el reloj GPS del usuario |
| Planificación semanal automática | Requiere historial de análisis previo — es v2 |
| Social / comparación con otros usuarios | No es el dolor del usuario objetivo |
| Nutrición | Fuera del dominio del producto |
| Seguimiento de trabajo de fuerza detallado | Out of scope metodológico para v1 |
| Soporte para ciclismo, natación u otros deportes | Foco en running para validar el producto |
| Integración directa con Garmin/Strava | Intervals.icu ya centraliza esos datos |

---

## 7. Métricas de Éxito

### Métrica norte
**Continuidad de entrenamiento:** % de usuarios que mantienen 3+ semanas consecutivas de actividad registrada y analizada.

*Justificación: La continuidad es el KPI central de la metodología de Luis del Águila. Si el producto funciona, los usuarios entrenan mejor, se lesionan menos y no abandonan.*

### Métricas de soporte

| Métrica | Objetivo v1 |
|---|---|
| Sesiones analizadas por usuario por semana | ≥ 3 |
| % usuarios que registran RPE post-entreno | ≥ 70% |
| Retención a 30 días | ≥ 50% |
| % usuarios que abren el análisis dentro de las 2h post-entreno | ≥ 60% |

### Señal cualitativa
Un usuario que dice *"esto me hizo darme cuenta de que estaba yendo demasiado rápido en mis rodajes suaves"* es una validación de que el producto está funcionando.

---

## 8. Suposiciones y Riesgos

### Suposiciones
- Los usuarios tienen cuenta en Intervals.icu o están dispuestos a crearla (es gratuita)
- Los relojes GPS del usuario registran FC durante los entrenamientos
- Los usuarios registrarán el RPE de forma consistente (requiere hábito)

### Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| API de Intervals.icu con limitaciones o cambios | Alto | Evaluar acuerdos, diseñar capa de abstracción |
| Usuarios no adoptan el registro de RPE | Medio | Hacer el input de RPE el primer paso al abrir la app post-entreno |
| Complejidad del análisis abruma al usuario | Alto | Feedback en lenguaje de runner, no de fisiólogo. Máximo 3 insights por sesión |
| Calibración de umbrales (FC máxima, zonas) por usuario | Medio | Onboarding con test de FC máxima o input manual |

---

## 9. Preguntas Abiertas — RESUELTAS

1. **¿Cómo se calibran las 3 zonas?**
   - **Opción A (usuario avanzado):** ingresa manualmente la FC máxima de cada zona si ya la conoce
   - **Opción B (usuario sin datos):** sube un test de umbrales desde Intervals.icu → la app detecta el punto de ruptura del Cardiac Drift automáticamente y calcula las zonas
   - El punto de ruptura define la FC máxima de Z2. El ritmo en ese punto + 5–10 seg = ritmo máximo Z2. Ritmo máximo Z1 = ritmo máximo Z2 + 1m15 seg/km

2. **¿Sesiones sin FC?**
   - No se analizan. La app informa claramente al usuario que sin datos de FC no es posible ejecutar el análisis.

3. **¿Cardiac Drift aplica solo a rodajes o también a series?**
   - Se calcula en TODOS los entrenamientos. Es el indicador universal de si el cuerpo está adaptado al ritmo. Umbral: >4% = sesión mal ejecutada.

4. **¿La app educa sobre la metodología?**
   - Decisión de UX — se resuelve en diseño técnico. El feedback usa lenguaje de runner, no de fisiólogo.

---

## 10. Roadmap de Alto Nivel

| Fase | Qué incluye |
|---|---|
| **v1 — Validación** | Análisis post-entreno + Intervals.icu + RPE + Lesiones + App móvil |
| **v2 — Planificación** | Plan semanal personalizado basado en historial de análisis |
| **v3 — Expansión** | Más metodologías, comunidad, integración con otros deportes |
