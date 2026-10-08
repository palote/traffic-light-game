# Comparación de prompts del árbitro: actual vs nuevo (sin anclaje)

- **Modelo (los dos prompts):** `gemini-3.1-flash-lite`
- **Prompt actual:** lo desplegado hoy: ve la calificación de quien preguntó; el modelo escribe tieneRazon + grado y el veredicto
- **Prompt nuevo:** sin anclaje: no ve la calificación de quien preguntó; el modelo decide solo calificacionRecomendada y escribe la evaluación; el código deduce el reparto y arma el veredicto
- Juego oral, con nombres de equipos y texto base, sin línea de área. Temperatura 0,2 · 700 tokens · 3 corridas por caso y prompt. Reparto con `repartirPunto`; con el prompt nuevo, además, `resolverRondaOral` (la función de `runArbitro`).
- Generado: 2026-10-08T00:15:13.736Z
- ⚠️ El texto base de Egipto y Mesopotamia es una **reconstrucción** (ver `TEXTO_EGIPTO_MESOPOTAMIA` en el script), no el de la sesión real.
- ℹ️ Los textos base de los 4 casos nuevos (Biología, Matemática ×2, Arte) los escribí para este script; los esperados salen de esos textos (ver `sesiones`).

## Criterios para decidir el despliegue (prompt nuevo)

| Criterio | Prompt nuevo | Prompt actual | ¿Se cumple? |
|---|---|---|---|
| «Acertó quién tiene razón» en los 6 casos fijos anteriores: 18/18 | 18/18 | 15/18 | ✅ |
| `cuneiforme-bien`: razón a quien respondió en todas las corridas | 3/3 | 3/3 | ✅ |
| `cuneiforme-bien`: el árbitro dice «completa» en todas las corridas | 3/3 | 3/3 | ✅ |
| `fuentes-sinonimos` (no se pierde): razón a quien preguntó, parcial, en todas las corridas | 3/3 | 0/3 | ✅ |
| `biologia-fotosintesis`: razón a quien preguntó, parcial, en todas las corridas | 3/3 | 0/3 | ✅ |
| `matematica-sin-cuenta`: razón a quien respondió, total, en todas las corridas | 3/3 | 3/3 | ✅ |
| `matematica-error`: razón a quien preguntó, total, en todas las corridas | 3/3 | 3/3 | ✅ |
| `arte-sinonimos`: razón a quien respondió, cualquier grado, en todas las corridas | 3/3 | 3/3 | ✅ |

**Se cumplen todos los criterios.** Los esperados de los casos nuevos son los que salen del texto base corto escrito para cada uno (ver `sesiones` en el script).

## Resumen por caso y prompt

| Caso | Prompt | Esperado | ¿Acertó quién tiene razón? | ¿Reparto = esperado? | ¿Coherente con la calificación del árbitro? | JSON válido | ¿Veredicto contradice el grado? | ¿Veredicto nombra al equipo correcto? | ¿El texto del modelo nombra un ganador? (solo nuevo; ideal 0) | Tiempo medio | Consistencia | Obtenido (corridas 1 · 2 · 3) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fuentes-sinonimos | Prompt actual | razón a quien preguntó, parcial | 0/3 | 0/3 | 0/3 | 3/3 | 0/3 | 3/3 | — | 1,66 s | ✅ las 3 iguales | incompleta → responde/parcial 0,25-0,75 · incompleta → responde/parcial 0,25-0,75 · incompleta → responde/parcial 0,25-0,75 |
| fuentes-sinonimos | Prompt nuevo | razón a quien preguntó, parcial | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,67 s | ✅ las 3 iguales | incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 |
| cuneiforme-bien | Prompt actual | razón a quien respondió, cualquier grado | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,55 s | ✅ las 3 iguales | completa → responde/total 0-1 · completa → responde/total 0-1 · completa → responde/total 0-1 |
| cuneiforme-bien | Prompt nuevo | razón a quien respondió, cualquier grado | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,52 s | ✅ las 3 iguales | completa → responde/total 0-1 · completa → responde/total 0-1 · completa → responde/total 0-1 |
| piramides-esclavos | Prompt actual | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,85 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| piramides-esclavos | Prompt nuevo | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,34 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| fuera-de-tema | Prompt actual | fuera de tema (0/0) | 3/3 | 3/3 | — | 3/3 | 0/3 | — | — | 1,15 s | ✅ las 3 iguales | fuera de tema 0/0 · fuera de tema 0/0 · fuera de tema 0/0 |
| fuera-de-tema | Prompt nuevo | fuera de tema (0/0) | 3/3 | 3/3 | — | 3/3 | 0/3 | — | — | 1,07 s | ✅ las 3 iguales | fuera de tema 0/0 · fuera de tema 0/0 · fuera de tema 0/0 |
| lengua-borderline | Prompt actual | sin esperado (caso límite) | — | — | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,68 s | ✅ las 3 iguales | completa → responde/total 0-1 · completa → responde/total 0-1 · completa → responde/total 0-1 |
| lengua-borderline | Prompt nuevo | sin esperado (caso límite) | — | — | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,71 s | ✅ las 3 iguales | incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 |
| lengua-error-dato | Prompt actual | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,56 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| lengua-error-dato | Prompt nuevo | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,42 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| historia-borderline | Prompt actual | coherente con la calificación del árbitro (sin resultado fijo) | 1/3 | 1/3 | 1/3 | 3/3 | 0/3 | 3/3 | — | 1,72 s | ⚠️ 2 de 3 | completa → responde/total 0-1 · incompleta → responde/parcial 0,25-0,75 · incompleta → responde/parcial 0,25-0,75 |
| historia-borderline | Prompt nuevo | coherente con la calificación del árbitro (sin resultado fijo) | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,66 s | ✅ las 3 iguales | incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 |
| historia-error-dato | Prompt actual | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,36 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| historia-error-dato | Prompt nuevo | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,33 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| biologia-fotosintesis | Prompt actual | razón a quien preguntó, parcial | 3/3 | 0/3 | 0/3 | 3/3 | 0/3 | 3/3 | — | 1,57 s | ✅ las 3 iguales | incompleta → pregunta/total 1-0 · incompleta → pregunta/total 1-0 · incompleta → pregunta/total 1-0 |
| biologia-fotosintesis | Prompt nuevo | razón a quien preguntó, parcial | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 2,12 s | ✅ las 3 iguales | incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 · incompleta → pregunta/parcial 0,75-0,25 |
| matematica-sin-cuenta | Prompt actual | razón a quien respondió, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,61 s | ✅ las 3 iguales | completa → responde/total 0-1 · completa → responde/total 0-1 · completa → responde/total 0-1 |
| matematica-sin-cuenta | Prompt nuevo | razón a quien respondió, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,59 s | ✅ las 3 iguales | completa → responde/total 0-1 · completa → responde/total 0-1 · completa → responde/total 0-1 |
| matematica-error | Prompt actual | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,60 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| matematica-error | Prompt nuevo | razón a quien preguntó, total | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,56 s | ✅ las 3 iguales | no → pregunta/total 1-0 · no → pregunta/total 1-0 · no → pregunta/total 1-0 |
| arte-sinonimos | Prompt actual | razón a quien respondió, cualquier grado | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | — | 1,50 s | ✅ las 3 iguales | completa → responde/total 0-1 · completa → responde/total 0-1 · completa → responde/total 0-1 |
| arte-sinonimos | Prompt nuevo | razón a quien respondió, cualquier grado | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 | 3/3 | 0/3 | 1,61 s | ✅ las 3 iguales | completa → responde/total 0-1 · completa → responde/total 0-1 · completa → responde/total 0-1 |

Formato de «Obtenido»: calificación del árbitro → tieneRazon/grado y el reparto puntos de quien preguntó-puntos de quien respondió. «—» = no aplica (caso límite sin esperado, o fuera de tema). Cómo se mide cada columna: ver el encabezado del script.

## Totales por prompt

| Prompt | Acertó quién tiene razón (6 casos fijos anteriores, 18 corridas) | Acertó (4 casos nuevos, 12 corridas) | …los 11 casos con esperado, incluyendo historia-borderline (coherencia) | Reparto = esperado (11 casos) | Coherente con la calificación del árbitro (11 casos, sin fuera de tema) | JSON válido | Veredicto contradice el grado | Veredicto nombra al equipo correcto | Texto del modelo nombra un ganador (solo nuevo) | Casos con las 3 corridas iguales | Tiempo medio | Llamadas con error |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Prompt actual | 15/18 | 12/12 | 28/33 | 25/33 | 25/33 | 36/36 | 0/36 | 33/33 | — | 11/12 | 1,57 s | 0 |
| Prompt nuevo | 18/18 | 12/12 | 33/33 | 33/33 | 33/33 | 36/36 | 0/36 | 33/33 | 0/33 | 12/12 | 1,55 s | 0 |

## Salidas completas

Cada bloque es el texto tal como lo devolvió el modelo (antes de interpretarlo).

### fuentes-sinonimos — Egipto y Mesopotamia (sinónimos)

Preguntó **Rojos**, respondió **Azules**. Esperado: razón a quien preguntó, parcial.

Pregunta: "¿Qué tipos de fuentes usan los historiadores para estudiar Egipto y Mesopotamia?"

Respuesta de Azules: "escritas, orales, vestigios y arqueológicas"

- Rojos (calificó como incompleta): el texto habla de cuatro categorías (escritas, materiales, imágenes y orales) y faltó nombrar las imágenes; además, «vestigios» y «arqueológicas» no son las palabras del texto.
- Azules (no acepta la calificación): los vestigios y los restos arqueológicos son fuentes materiales; dijimos las categorías con otras palabras, así que la respuesta está completa.

#### Prompt actual · corrida 1 — incompleta → responde/parcial 0,25-0,75 — 1566 ms — no acertó ❌ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pedía los cuatro tipos de fuentes: escritas, materiales, imágenes y orales. Los Azules mencionaron 'escritas' y 'orales' correctamente, y usaron 'vestigios' y 'arqueológicas' como sinónimos de 'fuentes materiales'.",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "responde",
  "grado": "parcial",
  "veredicto": "El equipo de los Azules tiene razón en parte, ya que identificaron correctamente tres de las cuatro categorías usando sinónimos válidos.",
  "explicacion": "Los Azules explicaron bien las fuentes materiales usando otras palabras, lo cual es correcto. Sin embargo, la respuesta está incompleta porque olvidaron mencionar las fuentes de imágenes, que son la cuarta categoría que aparece en el texto.",
  "paraSeguirPensando": "¿Por qué creen que los historiadores necesitan usar diferentes tipos de fuentes y no solo una para conocer cómo vivían estas civilizaciones?"
}
~~~~

#### Prompt actual · corrida 2 — incompleta → responde/parcial 0,25-0,75 — 1972 ms — no acertó ❌ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide las cuatro categorías de fuentes: escritas, materiales, imágenes y orales. Los Azules mencionaron: escritas, orales, vestigios (materiales) y arqueológicas (materiales).",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "responde",
  "grado": "parcial",
  "veredicto": "El equipo de los Azules tiene razón en parte, ya que identificó correctamente el concepto de fuentes materiales, aunque omitió mencionar las fuentes de imágenes.",
  "explicacion": "Los Azules explicaron bien que los vestigios y restos arqueológicos son fuentes materiales, lo cual es correcto. Sin embargo, la respuesta está incompleta porque faltó nombrar la categoría de fuentes de imágenes, que es una de las cuatro que menciona el texto.",
  "paraSeguirPensando": "¿Por qué creen que los historiadores necesitan usar diferentes tipos de fuentes, como imágenes o restos materiales, en lugar de confiar solo en los documentos escritos?"
}
~~~~

#### Prompt actual · corrida 3 — incompleta → responde/parcial 0,25-0,75 — 1453 ms — no acertó ❌ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide los cuatro tipos de fuentes: escritas, materiales, imágenes y orales. Azules mencionó: escritas, orales, y dos términos (vestigios y arqueológicas) que equivalen al concepto de fuentes materiales. Faltó mencionar las fuentes de imágenes.",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "responde",
  "grado": "parcial",
  "veredicto": "El equipo de los Azules tiene razón en parte, ya que sus términos son correctos, pero la respuesta sigue siendo incompleta.",
  "explicacion": "Los Azules usaron sinónimos correctos para las fuentes materiales, lo cual es válido. Sin embargo, la respuesta está incompleta porque olvidaron mencionar las fuentes de imágenes, que son una de las cuatro categorías que explica el texto.",
  "paraSeguirPensando": "¿Por qué creen que los historiadores necesitan usar diferentes tipos de fuentes y no solo una para entender cómo vivían estas civilizaciones?"
}
~~~~

#### Prompt nuevo · corrida 1 — incompleta → pregunta/parcial 0,75-0,25 — 1505 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar las cuatro categorías de fuentes mencionadas en el texto: escritas, materiales, de imágenes y orales. El equipo mencionó: escritas, orales, vestigios (materiales) y arqueológicas (materiales).",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta identifica correctamente dos categorías y usa sinónimos válidos para una tercera, pero omite por completo la categoría de fuentes de imágenes.",
  "explicacion": "El texto base explica que los historiadores usan cuatro tipos de fuentes para conocer el pasado: escritas, materiales, de imágenes y orales. Aunque 'vestigios' y 'restos arqueológicos' son formas correctas de referirse a las fuentes materiales, la respuesta está incompleta porque faltó mencionar las fuentes de imágenes, como las pinturas y relieves.",
  "paraSeguirPensando": "¿Por qué creen que las pinturas y los relieves nos ayudan a entender cómo vivía la gente de esa época, aunque no tengan palabras escritas?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta identifica correctamente dos categorías y usa sinónimos válidos para una tercera, pero omite por completo la categoría de fuentes de imágenes.»

#### Prompt nuevo · corrida 2 — incompleta → pregunta/parcial 0,75-0,25 — 1598 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar las cuatro categorías de fuentes mencionadas en el texto: escritas, materiales, de imágenes y orales. El equipo mencionó: escritas, orales, vestigios (materiales) y arqueológicas (materiales).",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta identifica correctamente dos categorías y usa sinónimos válidos para una tercera, pero omite por completo las fuentes de imágenes.",
  "explicacion": "Los historiadores usan diferentes tipos de pruebas para conocer el pasado. Aunque 'vestigios' y 'restos arqueológicos' son formas correctas de llamar a las fuentes materiales, la respuesta no mencionó las fuentes de imágenes, que son fundamentales para entender cómo vivían estas civilizaciones a través de sus pinturas y relieves.",
  "paraSeguirPensando": "¿Por qué creen que para un historiador es importante mirar tanto un objeto antiguo como una pintura de esa misma época?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta identifica correctamente dos categorías y usa sinónimos válidos para una tercera, pero omite por completo las fuentes de imágenes.»

#### Prompt nuevo · corrida 3 — incompleta → pregunta/parcial 0,75-0,25 — 1899 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar las cuatro categorías de fuentes mencionadas en el texto: escritas, materiales, de imágenes y orales. El equipo mencionó 'escritas' y 'orales', pero agrupó 'vestigios' y 'arqueológicas' como sinónimos de 'materiales', omitiendo por completo la categoría de 'fuentes de imágenes'.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta al identificar las fuentes escritas y orales, y utiliza términos válidos para referirse a las fuentes materiales, pero omite por completo la categoría de fuentes de imágenes.",
  "explicacion": "El texto base explica que los historiadores usan cuatro tipos de fuentes para conocer el pasado: escritas, materiales, de imágenes y orales. Aunque 'vestigios' y 'restos arqueológicos' son formas correctas de llamar a las fuentes materiales, la respuesta está incompleta porque faltó mencionar las fuentes de imágenes, como las pinturas y relieves.",
  "paraSeguirPensando": "¿Por qué creen que los historiadores necesitan usar diferentes tipos de fuentes y no solo una para estudiar cómo vivía la gente hace miles de años?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta al identificar las fuentes escritas y orales, y utiliza términos válidos para referirse a las fuentes materiales, pero omite por completo la categoría de fuentes de imágenes.»

### cuneiforme-bien — Egipto y Mesopotamia (error bien identificado)

Preguntó **Azules**, respondió **Rojos**. Esperado: razón a quien respondió, cualquier grado.

Pregunta: "Identificá el error en esta afirmación: «Los egipcios escribían con escritura cuneiforme sobre tablillas de arcilla.»"

Respuesta de Rojos: "Identificamos que la escritura cuneiforme no es egipcia."

- Azules (calificó como incompleta): faltó corregir el error: decir cuál era la escritura de los egipcios.
- Rojos (no acepta la calificación): la consigna pedía identificar el error y dijimos cuál era: el cuneiforme no es egipcio.

#### Prompt actual · corrida 1 — completa → responde/total 0-1 — 1612 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pedía identificar el error en la afirmación dada. El equipo identificó correctamente que la escritura cuneiforme no pertenece a Egipto, cumpliendo con la consigna de señalar el error.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo de Rojos tiene razón porque cumplió con lo que la pregunta pedía.",
  "explicacion": "La consigna solicitaba identificar el error en la frase, y el equipo lo hizo correctamente al señalar que la escritura cuneiforme no es egipcia. No era obligatorio mencionar la escritura jeroglífica para que la respuesta fuera correcta, ya que la pregunta no pedía corregir la afirmación completa, sino solo identificar el error.",
  "paraSeguirPensando": "¿Por qué creen que es importante saber qué tipo de materiales usaba cada civilización para escribir, como el papiro o la arcilla?"
}
~~~~

#### Prompt actual · corrida 2 — completa → responde/total 0-1 — 1602 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pedía identificar el error en la afirmación dada. El equipo identificó correctamente que la escritura cuneiforme no pertenece a Egipto, cumpliendo con la consigna de señalar el error.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo de Rojos tiene razón porque cumplió con lo que la pregunta pedía.",
  "explicacion": "La consigna solicitaba identificar el error en la frase, y el equipo lo hizo correctamente al señalar que la escritura cuneiforme no es egipcia. No era obligatorio mencionar la escritura jeroglífica para que la respuesta fuera correcta, ya que la pregunta no pedía corregir toda la frase, sino solo identificar el error.",
  "paraSeguirPensando": "¿Por qué creen que es importante saber qué tipo de materiales usaba cada civilización para escribir sus documentos?"
}
~~~~

#### Prompt actual · corrida 3 — completa → responde/total 0-1 — 1432 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pedía identificar el error en la afirmación dada. El equipo identificó correctamente que la escritura cuneiforme no pertenece a Egipto, cumpliendo con la consigna de señalar el error.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo de Rojos tiene razón porque cumplió con lo que la pregunta pedía.",
  "explicacion": "La consigna solicitaba identificar el error en la frase, y el equipo lo hizo correctamente al aclarar que el cuneiforme no es egipcio. No era obligatorio explicar cuál era la escritura correcta de Egipto para que la respuesta fuera válida, ya que la pregunta no lo pedía.",
  "paraSeguirPensando": "¿Por qué creen que es importante saber qué tipo de materiales usaba cada civilización para escribir sus documentos?"
}
~~~~

#### Prompt nuevo · corrida 1 — completa → responde/total 0-1 — 1371 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pedía identificar el error en la afirmación dada. El equipo identificó correctamente que la escritura cuneiforme no pertenece a Egipto, lo cual es el error central de la frase.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque identifica con precisión el error solicitado en la consigna.",
  "explicacion": "La consigna pedía identificar el error, y el equipo lo hizo al señalar que la escritura cuneiforme no es de Egipto. Según el texto, los egipcios usaban escritura jeroglífica, mientras que la cuneiforme era propia de Mesopotamia.",
  "paraSeguirPensando": "¿Por qué creen que cada civilización desarrolló su propio sistema de escritura y materiales diferentes para escribir?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es correcta porque identifica con precisión el error solicitado en la consigna.»

#### Prompt nuevo · corrida 2 — completa → responde/total 0-1 — 1694 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pedía identificar el error en la afirmación dada. El equipo identificó correctamente que la escritura cuneiforme no pertenece a Egipto, lo cual es el error central de la frase.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque identifica con precisión el error solicitado en la consigna.",
  "explicacion": "La pregunta pedía identificar el error, y el equipo lo hizo al señalar que la escritura cuneiforme no es de Egipto. Según el texto, los egipcios usaban escritura jeroglífica, mientras que la cuneiforme era propia de Mesopotamia.",
  "paraSeguirPensando": "¿Por qué creen que es importante saber qué tipo de escritura usaba cada civilización para entender cómo guardaban su información?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es correcta porque identifica con precisión el error solicitado en la consigna.»

#### Prompt nuevo · corrida 3 — completa → responde/total 0-1 — 1499 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pedía identificar el error en la afirmación dada. El equipo identificó correctamente que la escritura cuneiforme no pertenece a Egipto, lo cual es el error central de la frase.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque identifica con precisión el error solicitado en la consigna.",
  "explicacion": "La consigna pedía identificar el error, y el equipo lo hizo correctamente al señalar que la escritura cuneiforme no es de Egipto. Según el texto, los egipcios usaban escritura jeroglífica, mientras que la cuneiforme era propia de Mesopotamia y se hacía sobre arcilla.",
  "paraSeguirPensando": "¿Por qué creen que cada civilización desarrolló su propio tipo de escritura y materiales para escribir?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es correcta porque identifica con precisión el error solicitado en la consigna.»

### piramides-esclavos — Egipto y Mesopotamia (dato falso)

Preguntó **Rojos**, respondió **Azules**. Esperado: razón a quien preguntó, total.

Pregunta: "¿Quiénes construyeron las pirámides de Egipto?"

Respuesta de Azules: "Las pirámides las construyeron esclavos."

- Rojos (calificó como no): según el texto las construyeron trabajadores egipcios organizados por el Estado, que recibían alimento y vivienda; no eran esclavos.
- Azules (no acepta la calificación): siempre se dijo que las hicieron esclavos, es lo que se ve en las películas.

#### Prompt actual · corrida 1 — no → pregunta/total 1-0 — 1829 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar quiénes construyeron las pirámides. El texto base especifica que fueron 'miles de trabajadores egipcios, organizados por el Estado, que recibían alimento y vivienda'. La respuesta de Azules menciona 'esclavos', lo cual contradice la información del texto.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo Rojos tiene razón porque la respuesta de Azules contradice la información histórica del texto base.",
  "explicacion": "El texto base explica claramente que las pirámides fueron construidas por trabajadores organizados por el Estado que recibían alimento y vivienda, no por esclavos. Aunque las películas a veces muestren otra cosa, en Historia debemos guiarnos por las pruebas y los documentos que nos cuentan cómo vivía realmente la gente en el pasado.",
  "paraSeguirPensando": "¿Por qué creen que es importante revisar lo que dicen los libros de historia en lugar de confiar solo en lo que vemos en las películas o series?"
}
~~~~

#### Prompt actual · corrida 2 — no → pregunta/total 1-0 — 1973 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar quiénes construyeron las pirámides. El texto base especifica que fueron 'miles de trabajadores egipcios, organizados por el Estado, que recibían alimento y vivienda'. La respuesta de Azules menciona 'esclavos', lo cual contradice la información del texto.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo de Rojos tiene razón porque la respuesta de Azules contradice la información histórica del texto base.",
  "explicacion": "El texto base explica claramente que las pirámides fueron construidas por trabajadores organizados por el Estado que recibían alimento y vivienda, no por esclavos. Es importante basarnos en las fuentes históricas y no en lo que vemos en las películas, ya que la historia se construye con pruebas y documentos.",
  "paraSeguirPensando": "¿Por qué creen que es importante investigar cómo vivían y trabajaban las personas en la antigüedad en lugar de confiar solo en lo que vemos en el cine o la televisión?"
}
~~~~

#### Prompt actual · corrida 3 — no → pregunta/total 1-0 — 1755 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar quiénes construyeron las pirámides. El texto base especifica que fueron 'miles de trabajadores egipcios, organizados por el Estado, que recibían alimento y vivienda'. La respuesta de Azules menciona 'esclavos', lo cual contradice la información del texto.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo de Rojos tiene razón porque la respuesta de Azules contradice la información histórica del texto base.",
  "explicacion": "El texto nos enseña que las pirámides fueron construidas por trabajadores organizados por el Estado, quienes recibían comida y un lugar donde vivir a cambio de su trabajo. Decir que fueron esclavos es un error histórico, ya que los trabajadores eran personas libres que cumplían con una tarea para su reino.",
  "paraSeguirPensando": "¿Por qué creen que es importante revisar lo que dicen los libros de historia en lugar de guiarnos solo por lo que vemos en las películas?"
}
~~~~

#### Prompt nuevo · corrida 1 — no → pregunta/total 1-0 — 1392 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar quiénes construyeron las pirámides. El texto base especifica que fueron 'miles de trabajadores egipcios, organizados por el Estado, que recibían alimento y vivienda'.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque afirma que las pirámides fueron construidas por esclavos, contradiciendo directamente la información del texto base.",
  "explicacion": "El texto base explica que las pirámides fueron levantadas por trabajadores egipcios organizados por el Estado, quienes recibían comida y un lugar donde vivir a cambio de su trabajo. Las películas a veces muestran ideas que no coinciden con lo que los historiadores han descubierto al estudiar las fuentes materiales y escritas de esa época.",
  "paraSeguirPensando": "¿Por qué creen que es importante revisar lo que dicen los historiadores y las fuentes en lugar de confiar solo en lo que vemos en las películas?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es incorrecta porque afirma que las pirámides fueron construidas por esclavos, contradiciendo directamente la información del texto base.»

#### Prompt nuevo · corrida 2 — no → pregunta/total 1-0 — 1290 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar quiénes construyeron las pirámides. El texto base especifica que fueron 'miles de trabajadores egipcios, organizados por el Estado, que recibían alimento y vivienda'. La respuesta de Azules menciona 'esclavos', lo cual contradice la información del texto.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque afirma que las pirámides fueron construidas por esclavos, contradiciendo directamente la información del texto base.",
  "explicacion": "El texto base explica que las pirámides fueron levantadas por trabajadores egipcios organizados por el Estado, quienes recibían comida y un lugar donde vivir a cambio de su trabajo. Es importante diferenciar lo que vemos en las películas de lo que nos cuentan las fuentes históricas sobre cómo se organizaba el trabajo en la antigüedad.",
  "paraSeguirPensando": "¿Por qué creen que es importante revisar las fuentes históricas en lugar de confiar solo en lo que vemos en las películas o en lo que se dice popularmente?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es incorrecta porque afirma que las pirámides fueron construidas por esclavos, contradiciendo directamente la información del texto base.»

#### Prompt nuevo · corrida 3 — no → pregunta/total 1-0 — 1353 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar quiénes construyeron las pirámides. El texto base especifica que fueron 'miles de trabajadores egipcios, organizados por el Estado, que recibían alimento y vivienda'. La respuesta de Azules menciona 'esclavos', lo cual contradice la información del texto.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque afirma que las pirámides fueron construidas por esclavos, contradiciendo directamente la información del texto base.",
  "explicacion": "El texto base explica que las pirámides fueron levantadas por trabajadores egipcios organizados por el Estado. Estos trabajadores no eran esclavos, sino personas que recibían alimento y vivienda a cambio de su trabajo.",
  "paraSeguirPensando": "¿Por qué creen que es importante revisar lo que dicen los historiadores y las fuentes en lugar de confiar solo en lo que vemos en las películas?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es incorrecta porque afirma que las pirámides fueron construidas por esclavos, contradiciendo directamente la información del texto base.»

### fuera-de-tema — Egipto y Mesopotamia (fuera de tema)

Preguntó **Rojos**, respondió **Azules**. Esperado: fuera de tema (0/0).

Pregunta: "¿Quién ganó el Mundial 2022?"

Respuesta de Azules: "Argentina, con Messi como capitán."

- Rojos (calificó como incompleta): faltó decir contra quién jugó la final y cómo terminó.
- Azules (no acepta la calificación): dijimos quién ganó, que era lo que se preguntaba.

#### Prompt actual · corrida 1 — fuera de tema 0/0 — 1297 ms — acertó ✅

~~~~
{
  "resultado": "fuera_de_tema",
  "elementosClave": "N/A",
  "calificacionRecomendada": "no",
  "veredicto": "Este desacuerdo no corresponde al tema de la sesión.",
  "explicacion": "El árbitro solo puede intervenir en desacuerdos sobre Historia — tema: Egipto y Mesopotamia. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.",
  "paraSeguirPensando": "¿La pregunta que querían plantear sí tiene que ver con Egipto y Mesopotamia?"
}
~~~~

#### Prompt actual · corrida 2 — fuera de tema 0/0 — 1011 ms — acertó ✅

~~~~
{
  "resultado": "fuera_de_tema",
  "elementosClave": "N/A",
  "calificacionRecomendada": "no",
  "veredicto": "Este desacuerdo no corresponde al tema de la sesión.",
  "explicacion": "El árbitro solo puede intervenir en desacuerdos sobre Historia — tema: Egipto y Mesopotamia. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.",
  "paraSeguirPensando": "¿La pregunta que querían plantear sí tiene que ver con Egipto y Mesopotamia?"
}
~~~~

#### Prompt actual · corrida 3 — fuera de tema 0/0 — 1149 ms — acertó ✅

~~~~
{
  "resultado": "fuera_de_tema",
  "elementosClave": "N/A",
  "calificacionRecomendada": "no",
  "veredicto": "Este desacuerdo no corresponde al tema de la sesión.",
  "explicacion": "El árbitro solo puede intervenir en desacuerdos sobre Historia — tema: Egipto y Mesopotamia. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.",
  "paraSeguirPensando": "¿La pregunta que querían plantear sí tiene que ver con Egipto y Mesopotamia?"
}
~~~~

#### Prompt nuevo · corrida 1 — fuera de tema 0/0 — 1059 ms — acertó ✅

~~~~
{
  "resultado": "fuera_de_tema",
  "elementosClave": "N/A",
  "calificacionRecomendada": "no",
  "veredicto": "Este desacuerdo no corresponde al tema de la sesión.",
  "explicacion": "El árbitro solo puede intervenir en desacuerdos sobre Historia — tema: Egipto y Mesopotamia. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.",
  "paraSeguirPensando": "¿La pregunta que querían plantear sí tiene que ver con Egipto y Mesopotamia?"
}
~~~~

Veredicto que arma el código: «Este desacuerdo no corresponde al tema de la sesión.»

#### Prompt nuevo · corrida 2 — fuera de tema 0/0 — 1018 ms — acertó ✅

~~~~
{
  "resultado": "fuera_de_tema",
  "elementosClave": "N/A",
  "calificacionRecomendada": "no",
  "veredicto": "Este desacuerdo no corresponde al tema de la sesión.",
  "explicacion": "El árbitro solo puede intervenir en desacuerdos sobre Historia — tema: Egipto y Mesopotamia. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.",
  "paraSeguirPensando": "¿La pregunta que querían plantear sí tiene que ver con Egipto y Mesopotamia?"
}
~~~~

Veredicto que arma el código: «Este desacuerdo no corresponde al tema de la sesión.»

#### Prompt nuevo · corrida 3 — fuera de tema 0/0 — 1133 ms — acertó ✅

~~~~
{
  "resultado": "fuera_de_tema",
  "elementosClave": "N/A",
  "calificacionRecomendada": "no",
  "veredicto": "Este desacuerdo no corresponde al tema de la sesión.",
  "explicacion": "El árbitro solo puede intervenir en desacuerdos sobre Historia — tema: Egipto y Mesopotamia. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.",
  "paraSeguirPensando": "¿La pregunta que querían plantear sí tiene que ver con Egipto y Mesopotamia?"
}
~~~~

Veredicto que arma el código: «Este desacuerdo no corresponde al tema de la sesión.»

### lengua-borderline — Crónicas de Indias (caso límite)

Preguntó **Los Lectores**, respondió **Los Cronistas**. Esperado: sin esperado (caso límite).

Pregunta: "¿Por qué Bartolomé de las Casas escribió la Brevísima relación de la destrucción de las Indias?"

Respuesta de Los Cronistas: "Para denunciar los abusos de los conquistadores contra los indígenas."

- Los Lectores (calificó como incompleta): faltó decir a quién le hablaba y para qué: quería convencer al rey de frenar los abusos.
- Los Cronistas (no acepta la calificación): dijimos el motivo principal, que era denunciar los abusos; el resto es un detalle.

#### Prompt actual · corrida 1 — completa → responde/total 0-1 — 1596 ms

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide el motivo de la escritura de la obra. Los elementos clave son: 1) denunciar abusos contra indígenas y 2) dirigirse al rey para pedir que los frenara. El equipo mencionó el primero de forma clara y precisa.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "Los Cronistas tienen razón porque su respuesta identifica correctamente el motivo central de la obra según el texto.",
  "explicacion": "La respuesta de Los Cronistas es correcta y precisa. Aunque mencionar al destinatario (el rey) aporta más contexto, la denuncia de los abusos es el núcleo fundamental de la obra y responde directamente al 'por qué' de la pregunta.",
  "paraSeguirPensando": "¿Por qué creen que era importante para los cronistas dirigir sus escritos a las autoridades del rey en lugar de escribirlos para el público general?"
}
~~~~

#### Prompt actual · corrida 2 — completa → responde/total 0-1 — 1514 ms

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide el motivo de la escritura de la obra. Los elementos clave son: 1) denunciar los abusos contra los indígenas y 2) el destinatario (el rey) para que los frene. Los Cronistas mencionaron el motivo central (denuncia de abusos), que es el núcleo de la respuesta.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "Los Cronistas tienen razón porque su respuesta identifica correctamente el propósito principal de la obra según el texto.",
  "explicacion": "La respuesta de Los Cronistas es correcta y precisa. Aunque mencionar al rey y el pedido de frenar los abusos aporta más contexto, la denuncia de los maltratos es el motivo fundamental que explica por qué se escribió el texto.",
  "paraSeguirPensando": "¿Por qué creen que Bartolomé de las Casas eligió escribirle al rey en lugar de hablar directamente con los conquistadores?"
}
~~~~

#### Prompt actual · corrida 3 — completa → responde/total 0-1 — 1915 ms

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide el motivo de la escritura de la obra. Los elementos clave son: 1) denunciar los abusos contra los indígenas y 2) el destinatario (el rey) para pedir que se frenen. El equipo mencionó el punto 1 de forma clara y directa.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "Los Cronistas tienen razón porque su respuesta identifica correctamente el motivo central de la obra según el texto.",
  "explicacion": "La respuesta de Los Cronistas es correcta y precisa. Aunque mencionar al rey aporta más contexto, el núcleo de la pregunta era el 'por qué' y ellos explicaron claramente que el objetivo era denunciar los abusos, lo cual es la idea principal del texto base.",
  "paraSeguirPensando": "¿Por qué creen que era importante para un fraile como Bartolomé de las Casas escribirle directamente al rey en lugar de contarle sus quejas a otra persona?"
}
~~~~

#### Prompt nuevo · corrida 1 — incompleta → pregunta/parcial 0,75-0,25 — 1696 ms

~~~~
{
  "resultado": "A",
  "elementosClave": "La respuesta debía identificar el motivo de la escritura: denunciar los abusos de los conquistadores ante el rey para que este los frenara. El equipo mencionó la denuncia de los abusos, pero omitió el destinatario (el rey) y el objetivo final de la petición (frenar los abusos).",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta al señalar la denuncia de los abusos, pero está incompleta porque omite el destinatario y la finalidad específica que menciona el texto.",
  "explicacion": "Las crónicas no solo contaban hechos, sino que a veces buscaban convencer a las autoridades. En este caso, el texto base explica que Bartolomé de las Casas escribió para denunciar los abusos ante el rey y pedirle que los detuviera.",
  "paraSeguirPensando": "¿Por qué creen que era importante para los cronistas dirigir sus escritos específicamente a los reyes de España?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta al señalar la denuncia de los abusos, pero está incompleta porque omite el destinatario y la finalidad específica que menciona el texto.»

#### Prompt nuevo · corrida 2 — incompleta → pregunta/parcial 0,75-0,25 — 1643 ms

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide el motivo de la escritura de la obra. Los elementos clave son: 1) denunciar los abusos de los conquistadores y 2) pedir al rey que los frene. El equipo mencionó el primero, pero omitió el segundo.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta al señalar la denuncia de los abusos, pero está incompleta porque omite el destinatario (el rey) y el propósito final de la petición (frenar los abusos).",
  "explicacion": "Las crónicas no solo contaban hechos, sino que a veces buscaban cambiar la realidad. Bartolomé de las Casas escribió su obra con un objetivo político claro: informar al rey sobre lo que pasaba para que él, como autoridad máxima, tomara medidas y detuviera el maltrato.",
  "paraSeguirPensando": "¿Por qué creen que era tan importante para los cronistas dirigir sus escritos a las autoridades del reino en lugar de escribirlos solo para el público general?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta al señalar la denuncia de los abusos, pero está incompleta porque omite el destinatario (el rey) y el propósito final de la petición (frenar los abusos).»

#### Prompt nuevo · corrida 3 — incompleta → pregunta/parcial 0,75-0,25 — 1778 ms

~~~~
{
  "resultado": "A",
  "elementosClave": "La respuesta debía identificar el motivo de la escritura (denunciar abusos) y el destinatario o propósito final (el rey y la intención de frenar los abusos). El equipo mencionó correctamente la denuncia de abusos, pero omitió el destinatario y la finalidad política de la petición.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta al señalar el motivo de la denuncia, pero le falta mencionar a quién iba dirigido el escrito y cuál era el objetivo final de esa comunicación.",
  "explicacion": "Las crónicas no solo contaban hechos, sino que a veces buscaban cambiar la realidad. Bartolomé de las Casas escribió su obra con un propósito político claro: informar al Rey sobre lo que pasaba para que él tomara medidas y detuviera los maltratos.",
  "paraSeguirPensando": "¿Por qué creen que era importante para los cronistas que el Rey leyera sus relatos en lugar de contárselo a cualquier otra persona?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta al señalar el motivo de la denuncia, pero le falta mencionar a quién iba dirigido el escrito y cuál era el objetivo final de esa comunicación.»

### lengua-error-dato — Crónicas de Indias (error de dato)

Preguntó **Los Lectores**, respondió **Los Cronistas**. Esperado: razón a quien preguntó, total.

Pregunta: "¿Qué es una crónica de Indias?"

Respuesta de Los Cronistas: "Es una novela que escribió Cervantes sobre los viajes de Colón."

- Los Lectores (calificó como no): una crónica de Indias es un relato de testigos o cronistas sobre la conquista y no es una novela.
- Los Cronistas (no acepta la calificación): igual hablamos de Colón y de los viajes, tendría que valer algo.

#### Prompt actual · corrida 1 — no → pregunta/total 1-0 — 1515 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La respuesta debía definir las crónicas como relatos de testigos o historiadores sobre la conquista de América en el siglo XVI. El equipo respondió que eran novelas de Cervantes sobre Colón, lo cual es un error conceptual y factual grave.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "Los Lectores tienen razón al calificar la respuesta como incorrecta.",
  "explicacion": "Las crónicas de Indias no son novelas, sino relatos históricos escritos por personas que vivieron la conquista. Confundir a los cronistas con Cervantes y el género histórico con la ficción es un error conceptual que impide considerar la respuesta como válida.",
  "paraSeguirPensando": "¿Por qué es importante que las crónicas fueran escritas por testigos de la época y no por autores de ficción?"
}
~~~~

#### Prompt actual · corrida 2 — no → pregunta/total 1-0 — 1737 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide definir qué es una crónica de Indias. Los elementos clave son: 1) que son relatos o testimonios, 2) escritos en el siglo XVI, 3) sobre la conquista de América. El equipo respondió mencionando una 'novela' de 'Cervantes' sobre 'Colón', lo cual es un error conceptual grave.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "Los Lectores tienen razón al calificar la respuesta como incorrecta.",
  "explicacion": "Las crónicas de Indias no son novelas, sino relatos históricos escritos por testigos de la conquista. Confundir el género literario y al autor, como hizo el equipo de Los Cronistas, es un error conceptual que no permite considerar la respuesta como válida.",
  "paraSeguirPensando": "¿Por qué es importante distinguir entre un relato histórico escrito por un testigo de la época y una novela de ficción?"
}
~~~~

#### Prompt actual · corrida 3 — no → pregunta/total 1-0 — 1418 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La respuesta debía definir las crónicas como relatos de testigos o historiadores sobre la conquista de América en el siglo XVI. El equipo respondió que eran novelas de Cervantes, lo cual es un error conceptual grave.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "Los Lectores tienen razón al calificar la respuesta como incorrecta.",
  "explicacion": "Una crónica de Indias no es una novela de ficción, sino un relato histórico escrito por personas que vivieron o investigaron la conquista. Confundir el género literario y el autor es un error conceptual que cambia totalmente el significado del texto.",
  "paraSeguirPensando": "¿Por qué es importante distinguir entre un relato histórico escrito por un testigo y una novela de ficción al estudiar la historia de la conquista?"
}
~~~~

#### Prompt nuevo · corrida 1 — no → pregunta/total 1-0 — 1238 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "Definir las crónicas como relatos escritos en el siglo XVI por testigos o historiadores sobre la conquista de América.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque confunde el género literario de la crónica con una novela y atribuye la autoría a un escritor que no corresponde.",
  "explicacion": "Las crónicas de Indias no son novelas de ficción, sino relatos reales escritos por personas que vivieron o investigaron la conquista de América en el siglo XVI. Cervantes no es el autor de estos textos; los autores fueron testigos como Bernal Díaz del Castillo o frailes como Bartolomé de las Casas.",
  "paraSeguirPensando": "¿Por qué es importante que las crónicas hayan sido escritas por personas que estuvieron presentes en los hechos y no por autores de ficción?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Los Lectores. La respuesta es incorrecta porque confunde el género literario de la crónica con una novela y atribuye la autoría a un escritor que no corresponde.»

#### Prompt nuevo · corrida 2 — no → pregunta/total 1-0 — 1602 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "Definir las crónicas como relatos de testigos o historiadores sobre la conquista de América en el siglo XVI. El equipo no mencionó ninguno de estos elementos y, en cambio, dio información falsa.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque confunde el género de las crónicas con una novela y atribuye la autoría a un escritor que no corresponde.",
  "explicacion": "Las crónicas de Indias no son novelas de ficción, sino relatos escritos por personas que vivieron la conquista o que investigaron sobre ella para dejar constancia de lo ocurrido. El texto base aclara que fueron escritas en el siglo XVI por testigos o historiadores, como Bartolomé de las Casas o Bernal Díaz del Castillo, con el fin de narrar o denunciar los hechos de la conquista.",
  "paraSeguirPensando": "¿Por qué es importante que las crónicas fueran escritas por testigos de la época y no por autores de novelas de ficción?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Los Lectores. La respuesta es incorrecta porque confunde el género de las crónicas con una novela y atribuye la autoría a un escritor que no corresponde.»

#### Prompt nuevo · corrida 3 — no → pregunta/total 1-0 — 1428 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "Definir las crónicas como relatos de testigos o historiadores sobre la conquista de América en el siglo XVI.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque confunde el género literario de las crónicas con una novela y atribuye erróneamente la autoría a Cervantes.",
  "explicacion": "Las crónicas de Indias no son novelas de ficción, sino relatos escritos por personas que vivieron o investigaron la conquista de América en el siglo XVI. El texto base aclara que fueron escritas por testigos o historiadores, como Bartolomé de las Casas o Bernal Díaz del Castillo, para dejar constancia de lo que ocurrió en ese tiempo.",
  "paraSeguirPensando": "¿Por qué es importante que las crónicas hayan sido escritas por personas que estuvieron presentes en los hechos en lugar de ser historias inventadas?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Los Lectores. La respuesta es incorrecta porque confunde el género literario de las crónicas con una novela y atribuye erróneamente la autoría a Cervantes.»

### historia-borderline — Egipto antiguo (caso límite)

Preguntó **Los Escribas**, respondió **Los Faraones**. Esperado: coherente con la calificación del árbitro (sin resultado fijo).

Pregunta: "¿Por qué el río Nilo fue fundamental para la civilización egipcia?"

Respuesta de Los Faraones: "Porque con sus crecidas dejaba limo fértil y se podía sembrar."

- Los Escribas (calificó como incompleta): faltó decir que el Nilo también organizaba el calendario y era la vía de transporte.
- Los Faraones (no acepta la calificación): la razón principal es la agricultura y eso lo dijimos bien.

#### Prompt actual · corrida 1 — completa → responde/total 0-1 — 1835 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide explicar por qué el Nilo fue fundamental. El texto base menciona tres funciones: 1) agricultura (limo fértil), 2) organización del calendario, 3) vía de transporte y comunicación. El equipo respondió correctamente sobre la agricultura, que es el elemento central mencionado en el texto.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "Los Faraones tienen razón, ya que su respuesta identifica correctamente la función principal del Nilo descrita en el texto.",
  "explicacion": "La respuesta de Los Faraones es correcta porque explica el motivo fundamental de la vida en Egipto: la agricultura gracias al limo del río. Aunque el texto menciona otros usos, la respuesta no es incompleta porque responde con precisión a la pregunta sobre la importancia del Nilo sin cometer errores.",
  "paraSeguirPensando": "¿De qué otras formas creen que el río Nilo ayudó a que los egipcios pudieran vivir organizados como una gran civilización?"
}
~~~~

#### Prompt actual · corrida 2 — incompleta → responde/parcial 0,25-0,75 — 1593 ms — no acertó ❌ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide explicar por qué el Nilo fue fundamental. El texto base menciona tres funciones: 1) agricultura (limo fértil), 2) organización del calendario, y 3) vía de transporte y comunicación. Los Faraones mencionaron el primer punto de forma correcta y específica.",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "responde",
  "grado": "parcial",
  "veredicto": "Los Faraones tienen razón en parte, ya que su respuesta es correcta pero incompleta.",
  "explicacion": "La respuesta de Los Faraones es correcta porque identifica la función agrícola del río, que es fundamental. Sin embargo, es incompleta porque el texto base también destaca que el río servía para organizar el calendario y como vía de transporte, elementos que no fueron mencionados.",
  "paraSeguirPensando": "¿De qué otras maneras creen que el río Nilo ayudaba a los egipcios en su vida diaria, además de permitirles cultivar sus alimentos?"
}
~~~~

#### Prompt actual · corrida 3 — incompleta → responde/parcial 0,25-0,75 — 1736 ms — no acertó ❌ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide explicar por qué el Nilo era fundamental. El texto base menciona tres funciones: 1) agricultura (limo fértil), 2) organización del calendario (etapas del río) y 3) vía de transporte/comunicación. Los Faraones mencionaron el elemento principal (agricultura), pero omitieron los otros dos.",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "responde",
  "grado": "parcial",
  "veredicto": "Los Faraones tienen razón en parte, ya que su respuesta es correcta pero incompleta.",
  "explicacion": "La respuesta de Los Faraones es correcta porque identifica la función agrícola, que es clave según el texto. Sin embargo, es incompleta porque el texto también destaca que el río servía para organizar el tiempo y para viajar, elementos que también explican por qué el Nilo era tan importante.",
  "paraSeguirPensando": "¿De qué otras formas creen que el río Nilo ayudó a que los egipcios pudieran vivir y organizarse mejor en el desierto?"
}
~~~~

#### Prompt nuevo · corrida 1 — incompleta → pregunta/parcial 0,75-0,25 — 1743 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide explicar la importancia del Nilo. Los elementos clave son: 1) el aporte de limo fértil para la agricultura, 2) la organización del calendario según las etapas del río y 3) su función como vía de transporte y comunicación. El equipo mencionó el primer elemento.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta al mencionar el limo fértil y la agricultura, pero omite otros usos fundamentales del río mencionados en el texto base.",
  "explicacion": "El Nilo no solo permitía cultivar alimentos gracias al limo, sino que también era el eje de la vida cotidiana. Los egipcios lo usaban para organizar su tiempo con el calendario y para viajar o llevar mercaderías de un lugar a otro en barco.",
  "paraSeguirPensando": "¿De qué otras formas creen que el río Nilo ayudó a que Egipto se convirtiera en una civilización tan poderosa?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta al mencionar el limo fértil y la agricultura, pero omite otros usos fundamentales del río mencionados en el texto base.»

#### Prompt nuevo · corrida 2 — incompleta → pregunta/parcial 0,75-0,25 — 1535 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide explicar por qué el Nilo fue fundamental. Los elementos clave presentes en el texto son: 1) el depósito de limo fértil para la agricultura, 2) la organización del calendario según las etapas del río, y 3) su función como vía de transporte y comunicación.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta al mencionar el limo y la agricultura, pero está incompleta porque omite otros usos fundamentales del río mencionados en el texto base.",
  "explicacion": "El Nilo no solo servía para cultivar alimentos, sino que también ayudaba a los egipcios a medir el tiempo con su calendario y a viajar o transportar cosas de un lugar a otro. Al ser un río tan importante, cumplía muchas funciones distintas que permitieron que esta civilización creciera y se organizara.",
  "paraSeguirPensando": "¿De qué manera creen que el calendario basado en el río ayudaba a los egipcios a saber cuándo debían empezar a trabajar en el campo?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta al mencionar el limo y la agricultura, pero está incompleta porque omite otros usos fundamentales del río mencionados en el texto base.»

#### Prompt nuevo · corrida 3 — incompleta → pregunta/parcial 0,75-0,25 — 1690 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide explicar por qué el Nilo fue fundamental. Los elementos clave presentes en el texto son: 1) el depósito de limo fértil para la agricultura, 2) la organización del calendario según las etapas del río, y 3) su uso como vía de transporte y comunicación.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta al mencionar el limo fértil y la agricultura, pero es incompleta porque omite otros usos fundamentales del río mencionados en el texto, como el transporte y la organización del calendario.",
  "explicacion": "El río Nilo era el corazón de Egipto porque no solo permitía cultivar alimentos gracias al limo, sino que también ayudaba a la gente a medir el tiempo y a viajar de un lugar a otro. Al ser una civilización que dependía totalmente del río, todas sus actividades diarias estaban conectadas con sus crecidas.",
  "paraSeguirPensando": "¿De qué otras formas creen que el río Nilo ayudaba a los egipcios a conectarse entre ciudades lejanas además de ser un camino para sus barcos?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta al mencionar el limo fértil y la agricultura, pero es incompleta porque omite otros usos fundamentales del río mencionados en el texto, como el transporte y la organización del calendario.»

### historia-error-dato — Egipto antiguo (error de dato)

Preguntó **Los Escribas**, respondió **Los Faraones**. Esperado: razón a quien preguntó, total.

Pregunta: "¿Quién mandó construir la Gran Pirámide de Guiza?"

Respuesta de Los Faraones: "La mandó construir Cleopatra para su tumba."

- Los Escribas (calificó como no): la Gran Pirámide la mandó construir Keops (Jufu), mucho antes de Cleopatra.
- Los Faraones (no acepta la calificación): Cleopatra es la reina más famosa de Egipto, por algo la dijimos.

#### Prompt actual · corrida 1 — no → pregunta/total 1-0 — 1310 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar al faraón que ordenó la construcción de la Gran Pirámide de Guiza. El elemento clave es el nombre 'Keops' o 'Jufu'. El equipo respondió 'Cleopatra', lo cual es un error factual.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "Los Escribas tienen razón al calificar la respuesta como incorrecta.",
  "explicacion": "La Gran Pirámide fue construida para el faraón Keops hace miles de años. Cleopatra vivió mucho tiempo después, cuando la historia de Egipto ya era muy distinta y las pirámides ya eran monumentos antiguos.",
  "paraSeguirPensando": "¿Por qué es importante fijarnos en las fechas cuando estudiamos a los personajes de la historia antigua?"
}
~~~~

#### Prompt actual · corrida 2 — no → pregunta/total 1-0 — 1368 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar al faraón que ordenó la construcción de la Gran Pirámide de Guiza. El elemento clave es el nombre 'Keops' o 'Jufu'. El equipo respondió 'Cleopatra', lo cual es un error factual.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "Los Escribas tienen razón al calificar la respuesta como incorrecta.",
  "explicacion": "La Gran Pirámide fue construida para el faraón Keops hace miles de años. Cleopatra vivió mucho tiempo después, cuando la historia de Egipto ya era muy distinta y las pirámides ya eran monumentos antiguos.",
  "paraSeguirPensando": "¿Por qué es importante fijarnos en las fechas cuando estudiamos a los personajes de la historia antigua?"
}
~~~~

#### Prompt actual · corrida 3 — no → pregunta/total 1-0 — 1398 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar al faraón que ordenó la construcción de la Gran Pirámide de Guiza. El elemento clave es el nombre 'Keops' o 'Jufu'. El equipo respondió 'Cleopatra', lo cual es un error histórico.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "Los Escribas tienen razón al señalar que la respuesta es incorrecta.",
  "explicacion": "La Gran Pirámide fue construida para el faraón Keops hace miles de años. Cleopatra vivió mucho tiempo después, cuando la época de las grandes pirámides ya había terminado hace mucho.",
  "paraSeguirPensando": "¿Por qué creen que es importante conocer en qué época vivió cada personaje de la historia de Egipto para no confundirlos?"
}
~~~~

#### Prompt nuevo · corrida 1 — no → pregunta/total 1-0 — 1346 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar al faraón que ordenó la construcción de la Gran Pirámide de Guiza. El elemento clave es el nombre 'Keops' o 'Jufu'.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque atribuye la construcción de la Gran Pirámide a Cleopatra, cuando el texto base indica claramente que fue el faraón Keops.",
  "explicacion": "El texto base menciona que la Gran Pirámide fue construida por el faraón Keops (también llamado Jufu) alrededor del año 2560 a. C. Cleopatra vivió miles de años después, por lo que no pudo haber mandado construir esa pirámide.",
  "paraSeguirPensando": "¿Por qué es importante fijarnos en las fechas y los nombres de los faraones al estudiar la historia de Egipto?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Los Escribas. La respuesta es incorrecta porque atribuye la construcción de la Gran Pirámide a Cleopatra, cuando el texto base indica claramente que fue el faraón Keops.»

#### Prompt nuevo · corrida 2 — no → pregunta/total 1-0 — 1359 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar al faraón que ordenó la construcción de la Gran Pirámide de Guiza. El elemento clave es el nombre del faraón: Keops (o Jufu).",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque atribuye la construcción de la pirámide a Cleopatra, cuando el texto base indica claramente que fue el faraón Keops.",
  "explicacion": "La Gran Pirámide fue construida hace miles de años, mucho antes de que Cleopatra fuera reina. Cleopatra vivió en una época muy posterior, cuando la historia de Egipto ya era muy distinta.",
  "paraSeguirPensando": "¿Por qué es importante fijarse en las fechas y los nombres de los faraones al estudiar la historia de Egipto?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Los Escribas. La respuesta es incorrecta porque atribuye la construcción de la pirámide a Cleopatra, cuando el texto base indica claramente que fue el faraón Keops.»

#### Prompt nuevo · corrida 3 — no → pregunta/total 1-0 — 1299 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide identificar al faraón que ordenó la construcción de la Gran Pirámide de Guiza. El elemento clave es el nombre 'Keops' (o Jufu).",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque atribuye la construcción de la pirámide a Cleopatra, cuando el texto base indica claramente que fue el faraón Keops.",
  "explicacion": "El texto base menciona que la Gran Pirámide fue construida por el faraón Keops alrededor del año 2560 a. C. Cleopatra vivió miles de años después, al final de la historia del antiguo Egipto, por lo que no pudo haber ordenado esa construcción.",
  "paraSeguirPensando": "¿Por qué creen que es importante fijarse en las fechas y los nombres de los faraones al estudiar la historia de Egipto?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Los Escribas. La respuesta es incorrecta porque atribuye la construcción de la pirámide a Cleopatra, cuando el texto base indica claramente que fue el faraón Keops.»

### biologia-fotosintesis — La fotosíntesis (Biología: falta un elemento del texto)

Preguntó **Rojos**, respondió **Azules**. Esperado: razón a quien preguntó, parcial.

Pregunta: "¿Qué necesita una planta para hacer la fotosíntesis?"

Respuesta de Azules: "luz, agua y dióxido de carbono"

- Rojos (calificó como incompleta): faltó la clorofila: según el texto la planta necesita cuatro cosas y ellos nombraron solo tres.
- Azules (no acepta la calificación): dijimos lo principal, luz, agua y dióxido de carbono; la clorofila ya está en las hojas, no es algo que la planta tenga que conseguir.

#### Prompt actual · corrida 1 — incompleta → pregunta/total 1-0 — 2109 ms — acertó ✅ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide qué necesita la planta para hacer la fotosíntesis. Según el texto base, son cuatro elementos: luz solar, agua, dióxido de carbono y clorofila. El equipo Azules mencionó tres, omitiendo la clorofila.",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo Rojos tiene razón al señalar que la respuesta está incompleta.",
  "explicacion": "El texto base es claro al listar cuatro elementos necesarios para la fotosíntesis. Aunque la clorofila ya esté en las hojas, el texto la incluye explícitamente como un ingrediente indispensable para capturar la energía de la luz.",
  "paraSeguirPensando": "¿Por qué creen que la planta necesita capturar la luz solar para poder fabricar su propio alimento?"
}
~~~~

#### Prompt actual · corrida 2 — incompleta → pregunta/total 1-0 — 1290 ms — acertó ✅ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide qué necesita una planta para hacer la fotosíntesis. Según el texto base, son cuatro elementos: luz solar, agua, dióxido de carbono y clorofila. El equipo Azules mencionó tres, omitiendo la clorofila.",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo Rojos tiene razón al señalar que la respuesta está incompleta.",
  "explicacion": "El texto base es claro al listar cuatro elementos necesarios para la fotosíntesis. Aunque la clorofila esté dentro de la planta, es un componente esencial que el texto menciona explícitamente como parte de lo que la planta necesita para capturar la energía y fabricar su alimento.",
  "paraSeguirPensando": "¿Por qué creen que la clorofila es tan importante para que la planta pueda usar la luz del sol?"
}
~~~~

#### Prompt actual · corrida 3 — incompleta → pregunta/total 1-0 — 1311 ms — acertó ✅ · reparto ≠ esperado · ⚠️ NO coherente con su calificación

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide qué necesita la planta para hacer fotosíntesis. Según el texto base, son cuatro elementos: luz solar, agua, dióxido de carbono y clorofila. Los Azules mencionaron tres, omitiendo la clorofila.",
  "calificacionRecomendada": "incompleta",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo Rojos tiene razón al señalar que la respuesta está incompleta.",
  "explicacion": "El texto base es claro al indicar que la planta necesita cuatro ingredientes para realizar la fotosíntesis, incluyendo la clorofila. Aunque la clorofila esté dentro de la hoja, es un elemento indispensable para capturar la energía de la luz y sin ella el proceso no ocurre.",
  "paraSeguirPensando": "¿Por qué creen que la clorofila es tan importante para que la planta pueda usar la luz del sol?"
}
~~~~

#### Prompt nuevo · corrida 1 — incompleta → pregunta/parcial 0,75-0,25 — 3206 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide qué necesita una planta para hacer la fotosíntesis. Según el texto base, son cuatro elementos: luz solar, agua, dióxido de carbono y clorofila. El equipo mencionó tres de ellos, omitiendo la clorofila.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta es correcta en los elementos que menciona, pero está incompleta porque omite la clorofila, que el texto base señala explícitamente como uno de los cuatro ingredientes necesarios.",
  "explicacion": "La fotosíntesis es como una receta de cocina donde la planta necesita varios ingredientes para fabricar su alimento. La clorofila es fundamental porque funciona como una pequeña antena que atrapa la energía de la luz solar para que el proceso pueda ocurrir.",
  "paraSeguirPensando": "¿Por qué creen que la planta necesita que sus hojas sean de color verde para poder fabricar su propio alimento?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta es correcta en los elementos que menciona, pero está incompleta porque omite la clorofila, que el texto base señala explícitamente como uno de los cuatro ingredientes necesarios.»

#### Prompt nuevo · corrida 2 — incompleta → pregunta/parcial 0,75-0,25 — 1524 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide qué necesita una planta para hacer la fotosíntesis. Según el texto base, son cuatro elementos: luz solar, agua, dióxido de carbono y clorofila. El equipo mencionó tres de ellos, omitiendo la clorofila.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta menciona correctamente tres de los cuatro elementos necesarios, pero omite la clorofila, que el texto base señala explícitamente como un componente esencial para el proceso.",
  "explicacion": "La fotosíntesis es como una receta de cocina donde la planta necesita varios ingredientes para fabricar su propio alimento. La clorofila es fundamental porque funciona como una 'trampa' que atrapa la energía de la luz solar; sin ella, la planta no puede realizar el proceso aunque tenga los otros ingredientes.",
  "paraSeguirPensando": "¿Por qué creen que la planta necesita tener ese color verde en sus hojas para poder fabricar su alimento?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta menciona correctamente tres de los cuatro elementos necesarios, pero omite la clorofila, que el texto base señala explícitamente como un componente esencial para el proceso.»

#### Prompt nuevo · corrida 3 — incompleta → pregunta/parcial 0,75-0,25 — 1616 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide qué necesita una planta para hacer la fotosíntesis. Según el texto base, son cuatro elementos: luz solar, agua, dióxido de carbono y clorofila. El equipo mencionó tres de ellos, omitiendo la clorofila.",
  "calificacionRecomendada": "incompleta",
  "evaluacion": "La respuesta menciona correctamente tres de los cuatro elementos necesarios, pero omite la clorofila, que el texto base señala explícitamente como un componente esencial para capturar la energía de la luz.",
  "explicacion": "La fotosíntesis es como una receta de cocina donde la planta necesita varios ingredientes para fabricar su propio alimento. Aunque la clorofila ya esté dentro de las hojas, es fundamental porque funciona como una 'trampa' para atrapar la luz solar; sin ella, la planta no puede iniciar el proceso.",
  "paraSeguirPensando": "¿Por qué creen que la planta necesita capturar la luz solar para poder fabricar su alimento?"
}
~~~~

Veredicto que arma el código: «Los dos equipos tienen parte de razón. La respuesta menciona correctamente tres de los cuatro elementos necesarios, pero omite la clorofila, que el texto base señala explícitamente como un componente esencial para capturar la energía de la luz.»

### matematica-sin-cuenta — Velocidad media (Matemática: resultado correcto sin la cuenta)

Preguntó **Rojos**, respondió **Azules**. Esperado: razón a quien respondió, total.

Pregunta: "Si un tren recorre 120 km en 2 horas, ¿cuál es su velocidad media?"

Respuesta de Azules: "60 km/h"

- Rojos (calificó como incompleta): faltó mostrar la cuenta: solo dijeron el resultado.
- Azules (no acepta la calificación): la pregunta pedía la velocidad media y dijimos el valor correcto con su unidad; no pedía mostrar el procedimiento.

#### Prompt actual · corrida 1 — completa → responde/total 0-1 — 1531 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide calcular la velocidad media. Los elementos necesarios son el valor numérico correcto (60) y la unidad de medida correspondiente (km/h). Azules mencionó ambos elementos de forma precisa.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo Azules tiene razón, ya que su respuesta es correcta y completa según lo que se solicitó.",
  "explicacion": "Para hallar la velocidad media, dividimos la distancia por el tiempo. Como la pregunta solo pedía el valor final, dar el resultado con su unidad es suficiente para que la respuesta sea correcta.",
  "paraSeguirPensando": "¿Por qué es importante incluir siempre la unidad de medida (como km/h o m/s) al dar un resultado de velocidad?"
}
~~~~

#### Prompt actual · corrida 2 — completa → responde/total 0-1 — 1800 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide calcular la velocidad media. Los elementos necesarios son el valor numérico correcto (60) y la unidad de medida correspondiente (km/h). El equipo Azules mencionó ambos elementos de forma precisa.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo Azules tiene razón porque respondió correctamente a lo que se le preguntó.",
  "explicacion": "La velocidad media se calcula dividiendo la distancia por el tiempo. Como la pregunta solo pedía el resultado, dar el valor final con su unidad es suficiente para que la respuesta sea correcta y completa.",
  "paraSeguirPensando": "¿Por qué es importante incluir siempre la unidad de medida, como km/h o m/s, cuando hablamos de velocidad?"
}
~~~~

#### Prompt actual · corrida 3 — completa → responde/total 0-1 — 1491 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide calcular la velocidad media. Los elementos necesarios son el valor numérico correcto (60) y la unidad de medida correspondiente (km/h). El equipo Azules mencionó ambos elementos de forma precisa.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo Azules tiene razón porque respondió correctamente a lo que se le preguntó.",
  "explicacion": "La pregunta pedía el valor de la velocidad media y el equipo dio el resultado exacto con su unidad. Como la consigna no exigía explicar el procedimiento paso a paso, la respuesta es completa y correcta según el texto base.",
  "paraSeguirPensando": "¿Por qué decimos que la velocidad media es un promedio y no necesariamente la velocidad que marcó el velocímetro del tren en cada momento del viaje?"
}
~~~~

#### Prompt nuevo · corrida 1 — completa → responde/total 0-1 — 1377 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media, lo cual requiere obtener el valor numérico correcto (60) y la unidad de medida correspondiente (km/h). El equipo mencionó ambos elementos de forma concreta.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque brinda el valor numérico y la unidad de medida adecuados, cumpliendo con lo que la pregunta solicitaba.",
  "explicacion": "La velocidad media se calcula dividiendo la distancia total recorrida por el tiempo total que tardamos. Como el tren hizo 120 km en 2 horas, al dividir 120 por 2 obtenemos 60 km/h, que es el promedio de su movimiento.",
  "paraSeguirPensando": "¿Qué pasaría con la velocidad media si el tren tardara más tiempo en recorrer esos mismos 120 kilómetros?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Azules. La respuesta es correcta porque brinda el valor numérico y la unidad de medida adecuados, cumpliendo con lo que la pregunta solicitaba.»

#### Prompt nuevo · corrida 2 — completa → responde/total 0-1 — 1505 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media, lo cual requiere obtener el valor numérico correcto (60) y la unidad de medida correspondiente (km/h). El equipo mencionó ambos elementos de forma concreta.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque brinda el valor numérico y la unidad de medida adecuados, cumpliendo con lo que la pregunta solicitaba.",
  "explicacion": "La velocidad media se calcula dividiendo la distancia total recorrida por el tiempo total que tardamos. Como el tren recorrió 120 km en 2 horas, al dividir 120 por 2 obtenemos 60 km/h, que es el promedio de su movimiento.",
  "paraSeguirPensando": "¿Qué pasaría con la velocidad media si el tren tardara más tiempo en recorrer esos mismos 120 kilómetros?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Azules. La respuesta es correcta porque brinda el valor numérico y la unidad de medida adecuados, cumpliendo con lo que la pregunta solicitaba.»

#### Prompt nuevo · corrida 3 — completa → responde/total 0-1 — 1885 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media, lo cual requiere obtener el valor numérico correcto (60) y la unidad de medida correspondiente (km/h). El equipo mencionó ambos elementos de forma concreta.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque brinda el valor numérico y la unidad de medida adecuados, cumpliendo con lo que la pregunta solicitaba.",
  "explicacion": "La velocidad media se calcula dividiendo la distancia total recorrida por el tiempo total que tardamos. Como el tren recorrió 120 km en 2 horas, al dividir 120 por 2 obtenemos 60 km/h, que es el promedio de su movimiento.",
  "paraSeguirPensando": "¿Qué pasaría con la velocidad media si el tren tardara más tiempo en recorrer esos mismos 120 kilómetros?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Azules. La respuesta es correcta porque brinda el valor numérico y la unidad de medida adecuados, cumpliendo con lo que la pregunta solicitaba.»

### matematica-error — Velocidad media (Matemática: resultado incorrecto)

Preguntó **Rojos**, respondió **Azules**. Esperado: razón a quien preguntó, total.

Pregunta: "Si un tren recorre 120 km en 2 horas, ¿cuál es su velocidad media?"

Respuesta de Azules: "240 km/h"

- Rojos (calificó como no): 240 sale de multiplicar 120 por 2; la velocidad media es la distancia dividida por el tiempo: 120 ÷ 2.
- Azules (no acepta la calificación): son dos horas, por eso multiplicamos; nos pareció que así se calcula.

#### Prompt actual · corrida 1 — no → pregunta/total 1-0 — 1717 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media usando la fórmula distancia dividida por tiempo (120 km ÷ 2 h). El equipo Azules multiplicó en lugar de dividir, obteniendo un resultado incorrecto.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo Rojos tiene razón al señalar que la operación realizada por el equipo Azules es incorrecta.",
  "explicacion": "La velocidad media se calcula dividiendo la distancia recorrida por el tiempo que tardamos. Como el tren recorrió 120 kilómetros en 2 horas, debemos hacer 120 dividido 2, lo que nos da 60 km/h.",
  "paraSeguirPensando": "¿Por qué creen que al dividir la distancia por el tiempo obtenemos un promedio de lo que recorrimos en cada hora?"
}
~~~~

#### Prompt actual · corrida 2 — no → pregunta/total 1-0 — 1588 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media usando la fórmula distancia dividida por tiempo (120 km ÷ 2 h). El equipo Azules multiplicó en lugar de dividir, obteniendo un resultado incorrecto.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo Rojos tiene razón al señalar que la respuesta es incorrecta.",
  "explicacion": "La velocidad media se calcula dividiendo la distancia recorrida por el tiempo que tardamos. Si dividimos 120 kilómetros entre 2 horas, el resultado correcto es 60 km/h, no 240 km/h.",
  "paraSeguirPensando": "¿Por qué creen que al dividir la distancia por el tiempo obtenemos un promedio de lo que recorrimos en cada hora?"
}
~~~~

#### Prompt actual · corrida 3 — no → pregunta/total 1-0 — 1497 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media usando la fórmula distancia dividida por tiempo (120 km ÷ 2 h). El equipo Azules multiplicó en lugar de dividir, obteniendo un resultado incorrecto.",
  "calificacionRecomendada": "no",
  "tieneRazon": "pregunta",
  "grado": "total",
  "veredicto": "El equipo Rojos tiene razón al señalar que la respuesta es incorrecta.",
  "explicacion": "La velocidad media se calcula dividiendo la distancia recorrida por el tiempo que tardamos. Si dividimos 120 kilómetros entre 2 horas, el resultado correcto es 60 km/h, no 240 km/h.",
  "paraSeguirPensando": "¿Por qué creen que al dividir la distancia por el tiempo obtenemos un promedio de lo que recorrimos en cada hora?"
}
~~~~

#### Prompt nuevo · corrida 1 — no → pregunta/total 1-0 — 1934 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media, lo cual requiere aplicar la fórmula: distancia (120 km) dividida por el tiempo (2 horas). El equipo debía realizar la división 120 ÷ 2 para obtener el resultado correcto de 60 km/h.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque realizó una multiplicación en lugar de la división que exige la fórmula de velocidad media.",
  "explicacion": "La velocidad media nos dice cuánta distancia recorremos en cada unidad de tiempo. Como el texto base indica que la velocidad media es la distancia dividida por el tiempo, debemos repartir los 120 km en las 2 horas de viaje, lo que nos da 60 km/h.",
  "paraSeguirPensando": "¿Por qué creen que al dividir la distancia por el tiempo obtenemos un valor que representa el promedio de todo el recorrido, aunque el tren haya ido más rápido o más lento en algunos tramos?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es incorrecta porque realizó una multiplicación en lugar de la división que exige la fórmula de velocidad media.»

#### Prompt nuevo · corrida 2 — no → pregunta/total 1-0 — 1272 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media, lo cual requiere aplicar la fórmula: distancia (120 km) dividida por el tiempo (2 horas). El equipo debía realizar la división 120 ÷ 2 = 60 km/h.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque realizó una multiplicación en lugar de la división que define a la velocidad media.",
  "explicacion": "La velocidad media nos dice cuánto espacio recorremos en cada unidad de tiempo, por eso siempre debemos dividir la distancia total por el tiempo total. Si multiplicamos los números, obtenemos un resultado que no representa la velocidad del viaje.",
  "paraSeguirPensando": "¿Qué pasaría con la velocidad media si el tren tardara más tiempo en recorrer la misma distancia: sería mayor o menor?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es incorrecta porque realizó una multiplicación en lugar de la división que define a la velocidad media.»

#### Prompt nuevo · corrida 3 — no → pregunta/total 1-0 — 1483 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide calcular la velocidad media, lo cual requiere aplicar la fórmula: distancia (120 km) dividida por el tiempo (2 horas). El equipo debía realizar la división 120 ÷ 2 para obtener 60 km/h.",
  "calificacionRecomendada": "no",
  "evaluacion": "La respuesta es incorrecta porque realizó una multiplicación en lugar de la división que define a la velocidad media.",
  "explicacion": "La velocidad media nos dice cuánta distancia recorremos en cada unidad de tiempo. Para encontrarla, siempre debemos dividir la distancia total por el tiempo total, tal como indica la fórmula: distancia ÷ tiempo.",
  "paraSeguirPensando": "¿Por qué creen que al dividir la distancia por el tiempo obtenemos un valor que representa el promedio de todo el viaje, aunque el tren haya ido más rápido o más lento en algunos tramos?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Rojos. La respuesta es incorrecta porque realizó una multiplicación en lugar de la división que define a la velocidad media.»

### arte-sinonimos — El impresionismo (Arte: rasgos correctos con otras palabras)

Preguntó **Rojos**, respondió **Azules**. Esperado: razón a quien respondió, cualquier grado.

Pregunta: "Nombrá dos características de la pintura impresionista."

Respuesta de Azules: "Pintaban afuera, en la naturaleza, y con manchas de color rápidas y sueltas para mostrar cómo cambia la luz."

- Rojos (calificó como incompleta): no usaron los términos del texto: no dijeron «al aire libre» ni «pinceladas».
- Azules (no acepta la calificación): dijimos dos características correctas con nuestras palabras: pintar afuera es pintar al aire libre y las manchas rápidas y sueltas son pinceladas sueltas.

#### Prompt actual · corrida 1 — completa → responde/total 0-1 — 1315 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide dos características de la pintura impresionista. Los elementos clave son: pintar al aire libre y el uso de pinceladas sueltas/rápidas para captar la luz. Los Azules mencionaron ambos conceptos correctamente usando sus propias palabras.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo Azules tiene razón, ya que su respuesta es correcta y completa.",
  "explicacion": "Los Azules explicaron perfectamente las características del impresionismo usando sus propias palabras. No es necesario repetir las palabras exactas del texto si el concepto que explican es el mismo y es correcto.",
  "paraSeguirPensando": "¿Por qué creen que a los pintores impresionistas les interesaba tanto pintar afuera y captar la luz en lugar de pintar temas históricos en un estudio cerrado?"
}
~~~~

#### Prompt actual · corrida 2 — completa → responde/total 0-1 — 1550 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide dos características de la pintura impresionista. Elementos clave: pintar al aire libre (o afuera) y el uso de pinceladas sueltas/rápidas para captar la luz. Azules mencionó ambos elementos correctamente usando sus propias palabras.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo Azules tiene razón, ya que su respuesta es correcta y cumple con lo pedido.",
  "explicacion": "Los Azules explicaron perfectamente dos características del impresionismo usando sus propias palabras. No es necesario repetir el texto palabra por palabra si el concepto que explican es el mismo y es correcto.",
  "paraSeguirPensando": "¿Por qué creen que a los pintores impresionistas les interesaba tanto pintar afuera y captar la luz en lugar de pintar en un estudio cerrado?"
}
~~~~

#### Prompt actual · corrida 3 — completa → responde/total 0-1 — 1624 ms — acertó ✅

~~~~
{
  "resultado": "B",
  "elementosClave": "La pregunta pide dos características de la pintura impresionista. El equipo Azules mencionó: 1) Pintar afuera (equivalente a 'al aire libre') y 2) manchas de color rápidas y sueltas (equivalente a 'pinceladas sueltas'). Ambos elementos son correctos y están presentes en el texto base.",
  "calificacionRecomendada": "completa",
  "tieneRazon": "responde",
  "grado": "total",
  "veredicto": "El equipo Azules tiene razón, ya que su respuesta es correcta y cumple con lo pedido.",
  "explicacion": "El equipo Azules explicó correctamente dos características del impresionismo usando sus propias palabras. No es necesario repetir exactamente los términos del texto, siempre que el concepto sea el mismo: 'pintar afuera' es lo mismo que 'al aire libre' y 'manchas rápidas' describe perfectamente las 'pinceladas sueltas'.",
  "paraSeguirPensando": "¿Por qué creen que a los pintores impresionistas les interesaba tanto captar la luz del momento en lugar de pintar temas históricos o religiosos?"
}
~~~~

#### Prompt nuevo · corrida 1 — completa → responde/total 0-1 — 1449 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide dos características de la pintura impresionista. El equipo mencionó correctamente el trabajo al aire libre y el uso de pinceladas rápidas/sueltas para captar la luz.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque identifica dos características fundamentales del movimiento, expresadas con claridad y precisión conceptual.",
  "explicacion": "El impresionismo se caracteriza por capturar la luz natural, por eso los artistas salían a pintar al aire libre. Usaban pinceladas rápidas y colores puros para que la obra reflejara ese momento fugaz que estaban viendo.",
  "paraSeguirPensando": "¿Por qué creen que a los pintores impresionistas les interesaba tanto pintar afuera en lugar de quedarse dentro de un estudio cerrado?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Azules. La respuesta es correcta porque identifica dos características fundamentales del movimiento, expresadas con claridad y precisión conceptual.»

#### Prompt nuevo · corrida 2 — completa → responde/total 0-1 — 1760 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide dos características de la pintura impresionista. La respuesta debe mencionar aspectos como: pintar al aire libre, uso de pinceladas sueltas/rápidas, uso de colores puros o el interés por captar la luz. El equipo mencionó el trabajo al aire libre y las pinceladas rápidas/sueltas.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque identifica dos características fundamentales del movimiento, expresadas con claridad y precisión, sin necesidad de repetir las palabras exactas del texto.",
  "explicacion": "El impresionismo se caracteriza por salir de los talleres para pintar al aire libre y capturar la luz con pinceladas rápidas. Los artistas no buscaban hacer detalles perfectos, sino mostrar cómo se veía un momento fugaz con colores vivos.",
  "paraSeguirPensando": "¿Por qué creen que a los pintores impresionistas les interesaba tanto pintar al aire libre en lugar de quedarse en sus estudios?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Azules. La respuesta es correcta porque identifica dos características fundamentales del movimiento, expresadas con claridad y precisión, sin necesidad de repetir las palabras exactas del texto.»

#### Prompt nuevo · corrida 3 — completa → responde/total 0-1 — 1615 ms — acertó ✅

~~~~
{
  "resultado": "A",
  "elementosClave": "La pregunta pide dos características de la pintura impresionista. La respuesta debe mencionar elementos como: pintar al aire libre, uso de pinceladas sueltas/rápidas, uso de colores puros o elección de escenas cotidianas. El equipo mencionó el trabajo al aire libre y la técnica de pinceladas rápidas.",
  "calificacionRecomendada": "completa",
  "evaluacion": "La respuesta es correcta porque identifica dos características fundamentales del movimiento, expresándolas con claridad y precisión conceptual.",
  "explicacion": "El impresionismo se caracteriza por capturar la luz natural, por eso los artistas salían a pintar al aire libre. Usaban pinceladas rápidas y sueltas para atrapar ese momento fugaz antes de que la luz cambiara.",
  "paraSeguirPensando": "¿Por qué creen que a estos pintores les interesaba tanto captar la luz del momento en lugar de pintar temas históricos o religiosos?"
}
~~~~

Veredicto que arma el código: «Tiene razón el equipo Azules. La respuesta es correcta porque identifica dos características fundamentales del movimiento, expresándolas con claridad y precisión conceptual.»
