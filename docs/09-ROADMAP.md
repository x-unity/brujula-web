# 09 — Roadmap

Orden de construcción pensado para **no ahogarse**: entregar algo útil pronto, validarlo con gente real, y crecer sobre una base probada. Cada fase produce algo publicable por sí solo.

## Fase 0 — Fundaciones (en curso)
- [x] Documentación de arquitectura y decisiones (este repo).
- [ ] `VERIFY:` confirmar fuentes de datos: URL del RNPDNO, esquema, licencia de datasets comunitarios, catálogo INEGI.
- [ ] Decidir framework de la PWA (ligero, gama baja).
- [ ] Definir umbral de supresión de conteos bajos (privacidad).
- [ ] Fijar tokens de diseño y paleta (accesibilidad probada).
- [ ] `TODO:` contactar a un colectivo o a la CNB como aliado (recomendado antes de escalar).

## Fase 1 — MVP: mapa público histórico
El corazón del proyecto. Solo RNPDNO agregado, PWA, sin login.
- Pipeline Python: descarga → validación → limpieza/normalización (INEGI) → deduplicación → agregación (municipio + H3) → versionado.
- Supabase con datos agregados; generación de teselas (PMTiles) a Cloudflare.
- PWA con MapLibre + deck.gl: mapa de calor con LOD por zoom (estado → municipio → H3).
- Pantalla principal accesible: mapa + búsqueda + leyenda clara.
- **Criterio de éxito:** una persona sin experiencia técnica entiende la incidencia de su zona sin ayuda, y la plataforma aguanta un pico de tráfico.

## Fase 2 — Tendencias + alertas activas
- Series de tiempo sobre los snapshots versionados (comparar zonas, ver si mejora o empeora).
- Módulo 2: integrar Alerta AMBER (casos activos) en feed/mapa separado, con expiración.
- API pública abierta v1 (para periodistas/investigadores).

## Fase 3 — Reporte comunitario verificado
- Módulo 3a: reportes de familias/colectivos con **verificación por doble/triple validación**.
- Autenticación (Supabase) y RLS estricto.
- Anonimato cifrado del reportante; separación identidad/contenido.
- `TODO:` diseñar el flujo de verificación con un colectivo real.

## Fase 4 — Seguridad personal (apps nativas)
Aquí se justifica lo nativo (GPS en segundo plano, push confiable).
- Módulo 3b: acompañamiento virtual, botón de pánico silencioso, verificación de transporte, ubicación efímera.
- Apps iOS (Xcode) y Android.
- Distribución de la instancia self-host (Docker) para colectivos.

## Backlog (sin fase asignada)
- Puntos seguros comunitarios.
- Notificación a comercios cercanos ante alerta.
- Directorio de apoyo legal y psicológico por estado (bajo riesgo técnico, considerar adelantarlo).
- Soporte de lenguas indígenas.

## Regla de priorización
No avanzar a una fase nueva sin haber **validado la anterior con usuarios reales** y sin cumplir sus requisitos de privacidad y accesibilidad.
