# 04 — Modelo de datos

Base: **Supabase (Postgres + PostGIS)**. Este documento describe el modelo conceptual del MVP (mapa histórico agregado). El esquema SQL concreto se define en implementación; aquí va la estructura y el porqué.

> **Regla dura:** ninguna tabla que alimente el frontend público contiene registros individuales de personas. Todo lo público es agregado.

## Extensiones necesarias

- **PostGIS** — tipos y funciones geográficas; genera teselas vectoriales con `ST_AsMVT`.
- **H3** (extensión de H3 para Postgres) — indexación hexagonal jerárquica. `VERIFY:` disponibilidad de la extensión H3 en Supabase; si no, calcular índices H3 en el pipeline (Python) y guardarlos como columnas.

## Tablas conceptuales

### `geo_municipios` (catálogo, referencia)
Catálogo oficial de estados y municipios con sus claves INEGI y geometría de polígono.
- `clave_estado`, `clave_municipio`, `nombre`, `geom (polygon)`.
- Fuente: INEGI. Sirve para normalizar y para dibujar límites en el mapa.

### `casos_agregados_municipio`
Conteos agregados por municipio y periodo. **Alimenta el mapa a zoom bajo/medio.**
- `clave_municipio` (FK a `geo_municipios`)
- `periodo` (año, o año-mes)
- `rango_edad`, `sexo` (dimensiones no identificantes)
- `conteo` (entero)
- `snapshot_id` (FK a `data_snapshots`)

### `casos_agregados_h3`
Conteos agregados por celda H3 en varias resoluciones. **Alimenta el mapa a zoom alto y las capas de deck.gl.**
- `h3_index`
- `resolucion` (nivel H3)
- `periodo`, `rango_edad`, `sexo`
- `conteo`
- `snapshot_id`
- **Supresión:** filas con `conteo` bajo el umbral mínimo se omiten o se marcan (ver [`07-PRIVACY-SECURITY.md`](./07-PRIVACY-SECURITY.md)).

### `data_snapshots` (versionado / auditoría)
Cada corrida del pipeline.
- `snapshot_id`, `fuente`, `fecha_corrida`, `hash_fuente`, `notas`.
- Permite trazabilidad ("¿de dónde salió este número?") y series de tiempo.

## Multi-resolución para el mapa (LOD)

El mapa necesita datos distintos según el zoom (ver [`05-MAP-RENDERING.md`](./05-MAP-RENDERING.md)):

| Zoom del usuario | Datos que se sirven |
|------------------|---------------------|
| País (lejos) | Agregado por estado (derivable de municipio) |
| Estado | Agregado por municipio (`casos_agregados_municipio`) |
| Municipio / colonia (cerca) | Agregado por celda H3 fina (`casos_agregados_h3`) |

Estas resoluciones se **precalculan** en el pipeline y se materializan como teselas, no se calculan en cada request.

## Módulos futuros (no MVP, esbozo)

Cuando lleguen los módulos 2 y 3, se agregan tablas **en su propio esquema**, sin tocar lo anterior:

- **Alertas activas** (módulo 2): `alertas_activas` con casos vigentes de AMBER/colectivos verificados, con expiración.
- **Reportes comunitarios** (módulo 3): `reportes`, `verificaciones` (para el flujo de doble validación), con datos sensibles cifrados y RLS estricto. La identidad de quien reporta se cifra y se separa del contenido público.

## Seguridad a nivel de fila (RLS)

- Tablas agregadas públicas: lectura pública, escritura solo por el pipeline (service role).
- Tablas de módulos futuros con datos sensibles: RLS estricto, nada de acceso anónimo a datos crudos. Detalle en [`07-PRIVACY-SECURITY.md`](./07-PRIVACY-SECURITY.md).
