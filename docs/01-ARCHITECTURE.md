# 01 — Arquitectura

## Visión general

El sistema se organiza en **cuatro capas apiladas**. Cada capa es reemplazable sin tocar las otras, y se comunican por contratos simples (APIs / archivos con formato definido). Esto es lo que da la modularidad y la capacidad de expansión del proyecto.

```
┌─────────────────────────────────────────────────┐
│  CAPA 4 — Presentación                           │
│  PWA (web) primero → apps nativas después        │
│  MapLibre GL JS + deck.gl                        │
└───────────────▲─────────────────────────────────┘
                │  consume teselas + API REST/JSON
┌───────────────┴─────────────────────────────────┐
│  CAPA 3 — API y base de datos                    │
│  Supabase (Postgres + PostGIS)                   │
│  Sirve teselas vectoriales y endpoints de datos  │
└───────────────▲─────────────────────────────────┘
                │  escribe datos limpios y agregados
┌───────────────┴─────────────────────────────────┐
│  CAPA 2 — Procesamiento (ETL)                    │
│  Python: limpieza, deduplicación, agregación H3  │
└───────────────▲─────────────────────────────────┘
                │  datos crudos
┌───────────────┴─────────────────────────────────┐
│  CAPA 1 — Fuentes de datos (ingesta)             │
│  Conectores: RNPDNO, Alerta AMBER, colectivos    │
└─────────────────────────────────────────────────┘

        ┌──────────────────────────────┐
        │  Distribución de teselas     │
        │  PMTiles en Cloudflare R2+CDN│  ← sirve el mapa a escala,
        └──────────────────────────────┘     barato y cacheado
```

## Las cuatro capas

### Capa 1 — Fuentes de datos (ingesta)
Scrapers y conectores que traen información de afuera. **Cada fuente es un módulo independiente.** Si una fuente cambia de formato, solo se arregla ese conector, sin afectar al resto. Detalle en [`02-DATA-SOURCES.md`](./02-DATA-SOURCES.md).

### Capa 2 — Procesamiento (ETL y normalización)
Toma datos crudos y produce datos "listos para servir": limpieza, normalización de nombres de municipios, deduplicación, y agregación geográfica (H3). Escrita en Python. Corre de forma programada (cron / scheduled jobs), no en cada visita. Detalle en [`03-DATA-PIPELINE.md`](./03-DATA-PIPELINE.md).

### Capa 3 — API y base de datos
Guarda los datos ya agregados y los sirve. Supabase (Postgres + PostGIS). PostGIS puede generar teselas vectoriales directamente desde la base con `ST_AsMVT`. Detalle en [`04-DATA-MODEL.md`](./04-DATA-MODEL.md).

### Capa 4 — Presentación
La PWA primero; apps nativas después. Solo consume teselas y la API. No sabe nada de cómo se limpiaron los datos. Detalle en [`05-MAP-RENDERING.md`](./05-MAP-RENDERING.md).

## Decisión de plataforma: web/PWA primero

**Contexto:** el objetivo es llegar a todos los mexicanos. En México Android tuvo ~72% de participación en 2025, y por número real de dispositivos es aún mayor en la población más vulnerable a este problema (zonas rurales, adultos mayores, bajos recursos), donde predomina Android de gama baja.

**Conclusión:** empezar por iOS nativo sería un error de alcance. Una **PWA** corre en Android, iPhone y computadora con un solo código, sin descarga desde tienda, sin revisión de App Store (que puede rechazar temas sensibles), y con actualización instantánea para todos.

**Lo nativo se pospone** hasta el módulo de seguridad personal (check-in, botón de pánico), donde sí se necesita GPS en segundo plano, notificaciones push confiables y acceso a sensores. Ahí sí valen la pena Xcode y su equivalente Android.

## Stack técnico y justificación

| Pieza | Rol | Por qué |
|-------|-----|---------|
| **Supabase (Postgres + PostGIS)** | Capa 3 | Postgres maneja geo con PostGIS; genera teselas vectoriales; auth lista para el módulo de usuarios; APIs automáticas. |
| **Python** | Capa 2 | Ideal para ETL, limpieza y deduplicación de datos públicos mexicanos. |
| **MapLibre GL JS** | Motor de mapa | Open source, render en GPU (zoom fluido), teselas vectoriales, sin costo por uso. |
| **deck.gl** | Visualización | Capas de mapa de calor, hexágonos y 3D encima del mapa; la diferencia entre "puntitos" y una plataforma que impresiona. |
| **H3** | Agregación geográfica | Cuadrícula hexagonal jerárquica; resuelve el problema de niveles de detalle (LOD) de forma moderna y rápida. |
| **PMTiles + Cloudflare (R2 + CDN)** | Distribución | Sirve el mapa como archivos estáticos desde el borde; aguanta picos nacionales por casi nada de dinero. |
| **Cloudflare (Workers, DDoS)** | Infra / seguridad | Protección ante ataques (un proyecto así puede recibirlos), lógica ligera en el borde, caché. |
| **Docker** | Empaquetado | Permite que un colectivo self-hostee su propia instancia (modelo distribuido). |
| **NAS** | Dev / respaldo | Ambiente de pruebas y respaldo de datasets históricos. |

### Framework de la PWA
**Decisión: Vite + React.** El mapa (MapLibre + deck.gl) se renderiza casi enteramente en el cliente, por lo que el SSR de frameworks como Next.js no aporta beneficio real aquí y sí agrega peso. Vite da un bundle más pequeño, arranque más rápido, y configuración de PWA simple vía `vite-plugin-pwa` (service worker y caché offline de teselas casi sin configuración). Prioriza peso y velocidad, alineado con el objetivo de gama baja.

## Principio de escalabilidad clave

**Precalcular, no calcular en vivo.** El pipeline (Capa 2) corre la agregación por H3 una vez cuando llegan datos nuevos, genera las teselas y las publica a Cloudflare. Cuando entran miles de usuarios simultáneos, no tocan la base de datos ni el servidor: solo descargan teselas cacheadas del CDN. Esto separa un proyecto que se cae con 100 usuarios de una plataforma que aguanta un pico nacional.
