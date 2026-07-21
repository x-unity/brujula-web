# Brújula

> **Nombre de trabajo — provisional.** "Brújula" es un placeholder. Reemplazar por el nombre final del proyecto en todos los documentos cuando se decida.

Plataforma abierta para **visualizar y prevenir el problema de desapariciones en México**, empezando por un mapa público de incidencia por zona y creciendo de forma modular hacia alertas activas, reportes comunitarios y herramientas de seguridad personal.

## Propósito

Cruzar por primera vez, en un solo mapa accesible, los datos que hoy están fragmentados (Registro Nacional de Personas Desaparecidas, Alerta AMBER, reportes de colectivos) para que **cualquier persona con un teléfono** pueda entender la incidencia de su zona y tomar decisiones informadas. No sustituye a las autoridades ni a los colectivos: los complementa y les da herramientas.

## Principios de diseño (no negociables)

1. **Privacidad por diseño.** El mapa público solo muestra datos *agregados*. Nunca es posible identificar a una persona desde la plataforma.
2. **Modular y expansiva.** Cada capa y cada módulo se puede construir, lanzar y reemplazar sin tocar los demás.
3. **Accesible para todos.** Diseñar para el teléfono más barato y lento, y para la persona con menos experiencia técnica. Android gama baja es el objetivo, no el iPhone.
4. **Escalable y barato.** Debe aguantar un pico nacional de tráfico (p. ej. al salir en noticias) sin caerse y sin costos insostenibles para una ONG.
5. **Abierta.** Datos y APIs públicas para que periodistas, investigadores y otros desarrolladores construyan encima.
6. **Digna, no alarmista.** El tono comunica seriedad y respeto, no pánico.

## Decisión de plataforma

**Web / PWA primero.** En México Android domina el mercado (~72% en 2025, y más alto por número de dispositivos en población vulnerable). Una PWA llega a Android, iPhone y computadora con un solo código, sin fricción de descarga ni revisión de tiendas. Las apps nativas (iOS/Android) se dejan para después, cuando lleguemos a funciones que requieren GPS en segundo plano y notificaciones push confiables (módulo de seguridad personal).

## Cómo navegar esta documentación

| Documento | Contenido |
|-----------|-----------|
| [`AGENTS.md`](./AGENTS.md) | **Empieza aquí si eres un agente de IA.** Cómo usar este repo. |
| [`docs/01-ARCHITECTURE.md`](./docs/01-ARCHITECTURE.md) | Arquitectura de 4 capas y stack técnico con justificación. |
| [`docs/02-DATA-SOURCES.md`](./docs/02-DATA-SOURCES.md) | Fuentes de datos, formatos y advertencias. |
| [`docs/03-DATA-PIPELINE.md`](./docs/03-DATA-PIPELINE.md) | Pipeline ETL: ingesta, limpieza, deduplicación, agregación. |
| [`docs/04-DATA-MODEL.md`](./docs/04-DATA-MODEL.md) | Modelo de datos en Supabase/PostGIS y H3. |
| [`docs/05-MAP-RENDERING.md`](./docs/05-MAP-RENDERING.md) | Motor de mapa, teselas, LOD y streaming (estilo Google Earth). |
| [`docs/06-MODULES.md`](./docs/06-MODULES.md) | Los módulos del sistema y su orden. |
| [`docs/07-PRIVACY-SECURITY.md`](./docs/07-PRIVACY-SECURITY.md) | Privacidad, seguridad y modelo de amenazas. |
| [`docs/08-DESIGN-SYSTEM.md`](./docs/08-DESIGN-SYSTEM.md) | Sistema de diseño, accesibilidad y tono. |
| [`docs/09-ROADMAP.md`](./docs/09-ROADMAP.md) | Fases de construcción, empezando por el MVP. |

## Stack (resumen)

- **Datos / backend:** Supabase (Postgres + PostGIS), Python (ETL).
- **Mapa:** MapLibre GL JS + deck.gl + H3.
- **Distribución de teselas:** PMTiles sobre Cloudflare (R2 + CDN).
- **Frontend:** PWA (framework web a definir en `01-ARCHITECTURE.md`).
- **Infra / seguridad:** Cloudflare (CDN, DDoS, Workers), Docker (self-host para colectivos).

## Estado

Fase de diseño y documentación. Sin código todavía. Ver [`docs/09-ROADMAP.md`](./docs/09-ROADMAP.md).
