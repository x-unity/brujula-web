# 06 — Módulos

El sistema se compone de módulos independientes. Cada uno tiene su propia base de datos/esquema y se comunica con los demás por interfaces simples, de modo que se pueden lanzar por separado y crecer solos. **No construir un módulo posterior antes de validar el anterior.**

## Módulo 1 — Mapa público de consulta (MVP)

**Qué es:** un mapa de calor de incidencia de desapariciones por zona, basado en el RNPDNO histórico agregado.

- **Sin registro.** Cualquiera entra y lo usa.
- **Datos agregados** por estado → municipio → celda H3, con LOD por zoom.
- **Pantalla principal:** mapa grande de la ubicación/ciudad del usuario, colores simples de menor a mayor incidencia, barra de búsqueda por colonia/ciudad, y pocos botones grandes con íconos claros (ver casos activos, reportar, consejos de seguridad — algunos se activan en fases posteriores).
- **Objetivo de UX:** que lo entienda desde un joven hasta un adulto mayor sin experiencia técnica, sin menús escondidos ni texto pequeño.

Este módulo por sí solo ya es útil y publicable. Es lo primero que se construye.

## Módulo 2 — Alertas activas en tiempo real

**Qué es:** casos vigentes (Alerta AMBER + reportes de colectivos verificados) en un feed/mapa separado del histórico.

- Tiempo de respuesta y lógica **distintos** del histórico (por eso es otro módulo; lección de los sistemas AMBER de EE. UU. y Europa, que separan la alerta urgente del análisis de datos).
- Casos con **expiración**: una alerta activa deja de serlo cuando se resuelve o vence.
- Se activa **sin tocar el módulo 1**.

## Módulo 3 — Reporte comunitario y seguridad personal

**Qué es:** funciones para usuarios registrados. Es el módulo de mayor riesgo de privacidad; se construye al final y con más cuidado.

### 3a. Reporte comunitario verificado
- Una familia sube una ficha **una sola vez** y se distribuye a las instancias correctas.
- **Verificación por doble/triple validación** antes de publicar: un caso nuevo requiere confirmación de otro miembro de la comunidad, un colectivo verificado o un familiar. Replica digitalmente los protocolos de confianza que los colectivos ya usan, para evitar reportes falsos o malintencionados.
- **Reportes anónimos verificados:** la identidad de quien reporta se cifra y solo se revela con orden judicial; nunca queda expuesta a terceros (protección ante represalias).

### 3b. Seguridad personal (requiere apps nativas)
Aquí entran las funciones que necesitan GPS en segundo plano y push confiable, de ahí que las apps nativas se justifiquen en esta fase:
- **Acompañamiento virtual:** un contacto de confianza "acompaña" un trayecto en tiempo real solo mientras dura, con un toque para iniciar y apagado automático al llegar. Cero configuración previa.
- **Botón de pánico silencioso** que activa ubicación/grabación y notifica a contactos de confianza (no directamente a la policía, para no generar desconfianza).
- **Verificación de transporte:** escanear placa/QR del vehículo antes de subir; se guarda cifrado localmente y solo se sube si algo sale mal.
- **Ubicación efímera:** se activa solo ante inseguridad y se borra automáticamente pasado un tiempo. Sin historiales permanentes de movimiento.

## Ideas adicionales para módulos futuros (backlog)

- **Puntos seguros comunitarios:** negocios/casas marcados como refugio temporal.
- **Notificación a comercios cercanos** al activarse una alerta (comunidad como ojos activos).
- **Directorio de apoyo legal y psicológico** por estado, con guías paso a paso en lenguaje simple para levantar una denuncia. Bajo riesgo técnico, alto valor.
- **API pública abierta** por módulo, para que periodistas, investigadores y otros desarrolladores construyan encima y multipliquen el impacto.

## Orden de construcción

1. Módulo 1 (mapa histórico, PWA, sin login) — **MVP**.
2. Módulo 2 (alertas activas).
3. Módulo 3a (reporte comunitario verificado, web).
4. Módulo 3b (seguridad personal, apps nativas).

Detalle temporal en [`09-ROADMAP.md`](./09-ROADMAP.md).
