# 02 — Fuentes de datos

> **Nota para agentes:** las URLs y nombres de repositorios específicos deben confirmarse con un humano antes de darlos por buenos. Todo lo marcado `VERIFY:` requiere validación.

## 1. RNPDNO — Registro Nacional de Personas Desaparecidas y No Localizadas

Fuente principal para el mapa histórico. La Comisión Nacional de Búsqueda (CNB) publica una **versión pública** del registro.

- **Formato:** CSV / datos tabulares (aprox. 11 variables en la versión pública). `VERIFY:` número exacto de columnas y esquema vigente.
- **Granularidad geográfica:** a nivel **estado y municipio**, **sin coordenadas exactas**, por razones de privacidad. Esto es correcto y deseable para nuestros fines.
- **Cobertura:** histórico amplio.
- `VERIFY:` URL oficial de descarga vigente y frecuencia de actualización.

### Datasets comunitarios ya limpios
Existen repositorios de la comunidad (p. ej. en GitHub) que ya limpiaron y organizaron los datos del RNPDNO con scripts reutilizables. Pueden ahorrar mucho trabajo en la Capa 2.
- `VERIFY:` identificar el/los repositorios, su licencia y qué tan actualizados están antes de depender de ellos.

### Advertencias importantes (críticas para el pipeline)
- **Duplicados:** una misma persona puede aparecer en varios registros porque distintas fiscalías cargan por separado. La deduplicación es obligatoria. Ver [`03-DATA-PIPELINE.md`](./03-DATA-PIPELINE.md).
- **Nombres de municipios inconsistentes:** dolor recurrente en datos mexicanos. Requiere normalización contra un catálogo oficial (INEGI). `VERIFY:` catálogo de claves geográficas a usar.

## 2. Alerta AMBER México

Fuente para el módulo de **casos activos en tiempo real** (no histórico). Casos urgentes de menores.
- **Uso:** módulo 2 (alertas activas), separado del mapa histórico.
- `VERIFY:` forma de acceso (feed, scraping, API) y términos de uso.

## 3. Reportes de colectivos de búsqueda

Los colectivos de madres buscadoras y organizaciones civiles tienen información de campo que no está en registros oficiales. Ya han hecho mapeos artesanales (p. ej. por alcaldía en CDMX) pero de forma informal.
- **Uso futuro:** módulo 3 (reportes comunitarios verificados).
- **Requisito:** sistema de verificación por doble/triple validación antes de publicar. Ver [`06-MODULES.md`](./06-MODULES.md).
- **Riesgo:** datos sensibles; puede haber represalias. Tratamiento especial de privacidad en [`07-PRIVACY-SECURITY.md`](./07-PRIVACY-SECURITY.md).

## Referencias de contexto (no fuentes de datos, sino inspiración)

- **El Crimen** y **HoyoDeCrimen** — mapas de crimen general (homicidios, robos) por municipio/colonia. Útiles como referencia de UX y método, **no** son fuentes de desapariciones.
- **Ushahidi** — plataforma keniana open source para mapear crisis y reportes ciudadanos. Referencia de arquitectura modular y replicable.

## Estrategia de fuentes

- **MVP:** solo RNPDNO (histórico agregado). Suficiente para lanzar y validar.
- **Fase 2:** + Alerta AMBER (activos).
- **Fase 3:** + reportes de colectivos (con verificación).

Cada fuente entra como un conector independiente en la Capa 1, sin acoplarse a las demás.
