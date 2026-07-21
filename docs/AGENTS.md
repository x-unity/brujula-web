# Guía para agentes de IA

Este archivo le dice a un agente de IA (Claude Code u otro) cómo trabajar en este proyecto. Léelo completo antes de escribir código o tomar decisiones.

## Qué es este proyecto

Brújula (nombre provisional) es una plataforma abierta para visualizar y ayudar a prevenir el problema de desapariciones en México. El primer entregable es un **mapa público de incidencia por zona** basado en datos oficiales agregados. Lee [`README.md`](./README.md) para el panorama completo.

## Reglas que nunca debes romper

1. **Nunca expongas datos individuales de personas.** Todo lo que llega al frontend público debe estar agregado a nivel de zona (municipio, colonia o celda H3). Si una tarea te pide mostrar datos que permitan identificar a una persona, deténte y señálalo. Ver [`docs/07-PRIVACY-SECURITY.md`](./docs/07-PRIVACY-SECURITY.md).
2. **No inventes fuentes ni cifras.** Los datos vienen de fuentes específicas documentadas en [`docs/02-DATA-SOURCES.md`](./docs/02-DATA-SOURCES.md). Si una URL o dataset no está verificado, márcalo como `TODO: verificar` en vez de asumir.
3. **Respeta la separación en capas.** No mezcles lógica de ingesta con lógica de presentación. Cada capa se comunica por contratos (APIs) definidos en [`docs/01-ARCHITECTURE.md`](./docs/01-ARCHITECTURE.md).
4. **Optimiza para dispositivos de gama baja.** Android barato y lento es el objetivo. Antes de agregar una dependencia pesada al frontend, considera el peso y el rendimiento.
5. **Precalcula, no calcules en vivo.** La agregación geográfica se hace en el pipeline (offline), no en cada request. Ver [`docs/03-DATA-PIPELINE.md`](./docs/03-DATA-PIPELINE.md) y [`docs/05-MAP-RENDERING.md`](./docs/05-MAP-RENDERING.md).

## Orden de lectura recomendado

1. `README.md` — visión y principios.
2. `docs/01-ARCHITECTURE.md` — cómo encaja todo.
3. El documento específico del área en la que vas a trabajar.
4. `docs/07-PRIVACY-SECURITY.md` — siempre, sin importar el área.

## Convenciones

- **Idioma:** documentación y comentarios en español; nombres de código (variables, funciones, tablas) en inglés, en `snake_case` para SQL/Python y `camelCase` para JS/TS.
- **Marcadores:** usa `TODO:` para trabajo pendiente y `VERIFY:` para hechos o fuentes que requieren confirmación humana antes de dar por buenos.
- **Decisiones:** cuando tomes una decisión técnica relevante, documéntala con su *porqué*, no solo el *qué*. El contexto es lo que hace útil esta documentación.

## Qué NO hacer sin confirmación humana

- Conectar o publicar cualquier dato que no sea agregado.
- Elegir un proveedor de pago o incurrir en costos.
- Definir el nombre final del proyecto (ahora es "Brújula", provisional).
- Integrar reportes comunitarios sin el sistema de verificación descrito en [`docs/06-MODULES.md`](./docs/06-MODULES.md).
