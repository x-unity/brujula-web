# 05 — Renderizado del mapa

## La lección de TerraVision y Google Earth

TerraVision (ART+COM, años 90) fue un globo terráqueo virtual navegable, antecesor conceptual de Google Earth. La lección técnica que tomamos **no** es el globo 3D, sino *cómo* permiten volar desde el espacio hasta una calle sin cargar el planeta entero.

**Principio — Niveles de Detalle (LOD) con teselas (tiles):** nunca cargas todo el mundo. Cargas solo los cuadros (teselas) de la zona visible, al nivel de detalle que corresponde a tu zoom. Lejos ves poco detalle y datos agregados; al acercarte, se cargan progresivamente teselas más finas. Todo por streaming, bajo demanda.

**Aplicación directa a nuestro mapa de calor:**

| Zoom | Qué se muestra |
|------|----------------|
| México completo | País pintado por **estado** (agregado grueso) |
| Un estado | Detalle por **municipio** |
| Acercándose | Detalle por **colonia / celda H3 fina** |

Los datos cambian con el zoom, igual que la imagen satelital de Google Earth. Mostrar miles de puntos individuales a nivel país sería lento **e** incomprensible; el LOD lo resuelve.

## Piezas del stack de mapa

### MapLibre GL JS — motor del mapa
Versión open source de la tecnología de Mapbox. Render en **GPU** (por eso el zoom es suave como Google Earth), teselas vectoriales, sin costo por uso. Se ve profesional de fábrica. Es la base sobre la que se dibuja todo.

### deck.gl — capa de visualización de datos
Librería de Uber para pintar datos encima del mapa: mapas de calor, columnas 3D, hexágonos agregados, animaciones. Es la diferencia entre "un mapa con puntitos" y "una plataforma que impresiona al abrirla".

### H3 — sistema de agregación
Cuadrícula **hexagonal jerárquica** (también de Uber): divide el territorio en hexágonos, y cada hexágono se subdivide en más pequeños según el nivel. Es la respuesta moderna y rápida al problema de LOD de TerraVision. Se agregan los casos en hexágonos grandes cuando estás lejos y en finos cuando te acercas. Se ve espectacular y es muy rápido.

## Cómo se sirve a escala (sin quebrarse ni gastar de más)

Dos caminos, compatibles entre sí:

1. **Teselas desde PostGIS (`ST_AsMVT`):** Supabase/Postgres genera teselas vectoriales agregadas directamente desde la base. Modelo de streaming estilo Google Earth, sin comprar nada. Bueno para datos que cambian o para desarrollo.

2. **PMTiles en Cloudflare (recomendado para producción):** el pipeline precalcula todas las teselas y las empaqueta en un archivo **PMTiles**, servido como archivo estático desde **Cloudflare R2 + CDN**. El mapa se sirve desde el borde de la red: aguanta millones de visitas por casi nada de dinero y carga rapidísimo en todo el país. Es lo que hace el proyecto sostenible para una ONG.

```
Pipeline (Python) ──precalcula──► PMTiles ──► Cloudflare R2 + CDN
                                                     │
                                    (miles de usuarios simultáneos)
                                                     ▼
                                        MapLibre + deck.gl (en el navegador)
```

**Regla de oro:** los usuarios descargan teselas cacheadas del CDN, **no** tocan la base de datos ni el servidor. Por eso escala a un pico nacional.

## Requisitos de rendimiento y accesibilidad

- **Offline:** la PWA cachea las teselas visibles para funcionar con señal intermitente (clave en zonas rurales).
- **Gama baja:** probar en Android barato y lento. Limitar el número de capas activas y el peso del bundle.
- **Transiciones suaves** al hacer zoom (MapLibre las da) y **estados de carga elegantes** en vez de pantallas en blanco.

## Notas de diseño visual (ver también [`08-DESIGN-SYSTEM.md`](./08-DESIGN-SYSTEM.md))

- Paleta sobria, **no rojo alarmista puro**. Comunica seriedad y respeto, no pánico.
- Leyenda de color clara: la persona debe entender qué significa cada tono sin asustarse innecesariamente.
- Escala de color perceptualmente uniforme (p. ej. tipo viridis/magma adaptada) para que las diferencias de incidencia se lean bien.
