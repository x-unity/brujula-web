# 07 — Privacidad y seguridad

Este es el documento más importante del proyecto. Un manejo negligente de datos aquí puede poner en riesgo real a familias, testigos y a quien reporta. **Ante cualquier duda, elegir la opción que menos datos expone.**

## Principios rectores

1. **Privacidad por diseño y por defecto.** La configuración más segura es la predeterminada; el usuario no tiene que "activar" su protección.
2. **Minimización de datos.** No se recolecta ni se guarda nada que no sea estrictamente necesario. Sin logs innecesarios.
3. **Agregación pública.** Todo lo que llega al frontend público está agregado a nivel de zona. **Nunca** datos individuales.
4. **Cifrado.** Datos sensibles cifrados en el dispositivo antes de subir, cuando aplique. Cifrado en tránsito y en reposo.
5. **Descentralización cuando sea posible.** Ningún punto único de fuga debe comprometer a todo el país (ver self-hosting por colectivo).

## Reglas concretas por módulo

### Módulo 1 (mapa público)
- Solo datos agregados. El RNPDNO ya viene sin coordenadas exactas; se mantiene así.
- **Supresión de conteos bajos:** no publicar celdas H3 (o combinaciones de dimensiones) con un conteo por debajo de un umbral mínimo, porque un número muy pequeño en un área pequeña puede permitir inferir a una persona. `TODO:` definir el umbral (p. ej. suprimir o generalizar conteos menores a k). Documentar el criterio.
- Sin cuentas de usuario, sin rastreo del visitante. Analítica, si se usa, respetuosa de la privacidad y sin identificar personas.
- **Fichas individuales (nombre, foto) — decisión deliberada de NO alojarlas ni scrapearlas.** El RNPDNO publica fichas individuales precisamente para difusión (solicitar avistamientos, ayudar a localizar), asi que el objetivo de mostrarlas es legitimo. El riesgo real no es la naturaleza publica del dato, es la **caducidad**: el RNPDNO elimina a una persona del registro en cuanto es localizada (lo confirmamos empiricamente en el pipeline, ver docs/03-DATA-PIPELINE.md). Una copia propia (scrapeada) puede quedar desactualizada y mostrar como "desaparecida" a alguien ya encontrado, causando dano real (falsa esperanza, re-traumatizacion). Por eso: **incrustar en vivo** el portal oficial (Consulta Publica RNPDNO, `consultapublicarnpdno.segob.gob.mx/consulta`) via `<iframe>` en el frontend, en vez de replicar su contenido. **Confirmado (julio 2026): el sitio SI permite ser incrustado** (no bloquea con X-Frame-Options), asi que esta es la solucion implementada en produccion, no solo un enlace de salida. Nunca hacer scraping masivo ni almacenamiento propio de estas fichas.

### Módulo 2 (alertas activas)
- Casos con **expiración** automática; no se conservan alertas vencidas como datos personales activos.
- Solo información que las propias fuentes ya hacen pública (AMBER) o que un colectivo verificado autoriza publicar.

### Módulo 3 (reportes y seguridad personal)
- **Reportante anónimo:** su identidad se cifra y se separa del contenido del reporte. Solo se revela con orden judicial. Nunca expuesta a terceros.
- **Ubicación efímera:** la ubicación en tiempo real solo se activa ante inseguridad y se borra automáticamente pasado un tiempo si no ocurre nada. Sin historiales permanentes de movimiento "por si acaso".
- **Datos en el dispositivo:** cuando se pueda (p. ej. registro de placa de transporte), se guardan cifrados localmente y solo se suben si se dispara una alerta.
- **RLS estricto** en Supabase: nada de acceso anónimo a datos crudos. Separar identidad y contenido en tablas distintas con permisos distintos.

## Seguridad de infraestructura

- **Cloudflare** al frente: protección DDoS (un proyecto de este tema puede recibir ataques dirigidos), WAF, rate limiting.
- **Secretos** fuera del código: variables de entorno / gestor de secretos. Nunca claves en el repo.
- **Superficie mínima:** las tablas públicas solo exponen lo agregado; el service role del pipeline nunca se expone al cliente.
- **Self-hosting distribuido:** cada colectivo puede correr su propia instancia con Docker y sincronizar solo datos públicos entre nodos, de modo que un compromiso no exponga todo.

## Modelo de amenazas (esbozo, ampliar en implementación)

| Amenaza | Mitigación |
|---------|------------|
| Reidentificación desde datos "agregados" | Supresión de conteos bajos; generalización; sin coordenadas finas. |
| Fuga masiva de una base central | Minimización; descentralización; cifrado; separar identidad de contenido. |
| Represalias contra quien reporta | Anonimato cifrado; revelación solo por orden judicial. |
| Reportes falsos / desinformación | Verificación por doble/triple validación antes de publicar. |
| Ataque de denegación de servicio | Cloudflare (DDoS/WAF/rate limit); teselas estáticas cacheadas. |
| Rastreo del visitante del mapa | Sin cuentas en módulo 1; analítica respetuosa; sin logs innecesarios. |

## Cumplimiento y aliados

- Considerar la **Ley Federal de Protección de Datos Personales** aplicable y, para datos en posesión de autoridades, la normativa correspondiente. `VERIFY:` marco legal vigente con asesoría.
- **Fuertemente recomendado:** trabajar *con* un colectivo existente o con la CNB en vez de construir algo paralelo. Ya tienen la confianza de la gente y conocen las trampas legales y de seguridad.
