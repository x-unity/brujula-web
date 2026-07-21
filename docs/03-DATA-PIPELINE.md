# 03 — Pipeline de datos (ETL)

El pipeline es el corazón de la confiabilidad del mapa. Corre de forma **programada y offline** (no en cada visita), en Python, dentro de la Capa 2.

## Los seis pasos

### 1. Extracción programada
Un job descarga el CSV del RNPDNO y (en fases posteriores) consulta Alerta AMBER. Frecuencia sugerida: diaria. `VERIFY:` frecuencia real con la que se actualiza la fuente para no procesar de más.

### 2. Validación
Antes de procesar, verificar que:
- El formato/esquema no cambió (número y nombre de columnas).
- No hay corrupción evidente (filas vacías masivas, encoding roto).
- Si algo cambió, **fallar de forma visible** y avisar, no procesar datos malos en silencio.

### 3. Limpieza y normalización
- Normalizar **nombres de municipios y estados** contra el catálogo oficial de claves geográficas (INEGI). Este es el paso más propenso a errores en datos mexicanos.
- Normalizar tipos (fechas, edades, sexo) a un esquema interno consistente.
- Estandarizar valores faltantes.

### 4. Deduplicación
**Obligatorio.** Una persona puede aparecer varias veces por cargas de distintas fiscalías. Definir una clave de deduplicación razonable (combinación de atributos disponibles) documentando el criterio y sus límites.
- `TODO:` definir el algoritmo de dedup y medir cuántos duplicados elimina (métrica de calidad).

### 5. Agregación geográfica
Contar casos por zona y periodo **sin conservar identidades**:
- Agregar por municipio y por **celda H3** en varios niveles de resolución (para el LOD del mapa; ver [`05-MAP-RENDERING.md`](./05-MAP-RENDERING.md)).
- Agregar por dimensiones útiles y no identificantes: periodo (año/mes), rango de edad, sexo.
- **Regla de privacidad:** no publicar celdas con conteos tan bajos que permitan inferir a una persona. Definir un umbral mínimo de supresión. Ver [`07-PRIVACY-SECURITY.md`](./07-PRIVACY-SECURITY.md).

### 6. Publicación y versionado
- Escribir los resultados **agregados** a Supabase.
- Generar las teselas (PMTiles) y publicarlas a Cloudflare.
- **Versionar cada snapshot**: guardar cada corrida con fecha y hash de la fuente. Esto permite (a) mostrar tendencias en el tiempo y (b) responder con trazabilidad completa a "¿de dónde salió este número?". La credibilidad del proyecto depende de esto.

## Diagrama de flujo

```
[Fuente RNPDNO] 
      │ 1. descarga programada
      ▼
[Datos crudos]
      │ 2. validación de esquema  ──(falla)──► alerta + detener
      ▼
[Datos válidos]
      │ 3. limpieza + normalización (catálogo INEGI)
      ▼
[Datos normalizados]
      │ 4. deduplicación
      ▼
[Datos únicos]
      │ 5. agregación por municipio + H3 (con supresión de conteos bajos)
      ▼
[Datos agregados] ──► Supabase (Capa 3)
      │ 6. generar teselas + versionar snapshot
      ▼
[PMTiles] ──► Cloudflare (CDN)
```

## Principios

- **Idempotente:** correr el pipeline dos veces con la misma entrada produce el mismo resultado.
- **Auditable:** cada dato publicado se puede rastrear a su fuente y corrida.
- **Falla ruidosa:** ante datos inesperados, detenerse y avisar en vez de publicar basura.
