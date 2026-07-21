# 08 — Sistema de diseño

Objetivo: que la plataforma se vea **muy bien hecha, escalable y presentable**, y a la vez sea **legible para cualquier persona con un teléfono**, incluida gente mayor o con poca experiencia técnica. Definir el sistema desde el principio hace que todo se sienta coherente conforme se agregan módulos.

## Tono

Este es un tema doloroso. El diseño debe comunicar **seriedad, dignidad y respeto**, nunca pánico ni sensacionalismo.
- Nada de rojo alarmista puro como color dominante.
- Lenguaje claro, humano y directo. Sin jerga técnica ni burocrática.
- Estados vacíos y de error redactados con cuidado y empatía.

## Color

- **Escala de incidencia perceptualmente uniforme** (tipo viridis/magma adaptada) para que las diferencias se lean con precisión y sin drama. `TODO:` fijar la paleta exacta y probar accesibilidad de contraste.
- Paleta base sobria y neutra para la interfaz; el color fuerte se reserva para los datos, no para la decoración.
- **Contraste AA/AAA** (WCAG). Debe leerse bajo sol directo en un teléfono barato.
- Nunca depender solo del color para transmitir información (daltonismo): acompañar con etiquetas, texto o patrones.

## Tipografía

- Fuente legible, tamaños **grandes** por defecto. Priorizar lectura sobre densidad.
- Jerarquía clara y simple (título, subtítulo, cuerpo). Pocos niveles.
- Respetar el tamaño de fuente del sistema para usuarios que agrandan el texto.

## Layout y componentes

- **Pantalla principal:** mapa grande primero. Barra de búsqueda simple arriba. Pocos botones grandes con íconos claros abajo. Todo lo importante visible de un vistazo, sin menús escondidos.
- Áreas táctiles amplias (dedos, no cursores).
- Íconos siempre acompañados de etiqueta de texto.
- **Estados de carga elegantes** (esqueletos/transiciones), nunca pantallas en blanco.
- Transiciones suaves, especialmente en el zoom del mapa.

## Accesibilidad (requisito, no extra)

- Diseñar para el **peor teléfono**, no el mejor: Android de gama baja, lento, con señal intermitente.
- **Offline-first** en lo posible (la PWA cachea el mapa visible).
- Soporte de lector de pantalla; navegación por teclado donde aplique.
- **Internacionalización desde el día uno:** aunque se empiece en español, dejar la arquitectura lista para lenguas indígenas. Es parte de "para todos".

## Coherencia y escalabilidad del diseño

- Definir **tokens de diseño** (colores, tipografías, espaciados, radios, sombras) como fuente única de verdad, para que cada módulo nuevo herede el mismo lenguaje visual.
- Documentar los componentes reutilizables conforme se creen.
- Revisar cada pantalla nueva contra este documento antes de darla por terminada.

## Referencias de UX

- **El Crimen / HoyoDeCrimen** — cómo presentan incidencia en mapa (método y legibilidad).
- **Google Earth** — fluidez de navegación y zoom como estándar de calidad percibida.
- **Ushahidi** — patrones de reporte ciudadano y mapeo de crisis.
