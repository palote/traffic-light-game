// Compara el prompt ACTUAL de producción contra el prompt NUEVO del árbitro, los dos con el MISMO modelo
// (por defecto el de src/config.ts: gemini-3.1-flash-lite), con los mismos 12 casos y 3 corridas cada uno.
//
//  - Prompt ACTUAL: copia congelada de lo que está desplegado (scripts/fixtures/prompt-produccion-actual.cjs).
//    El modelo ve la calificación de quien preguntó dentro de la Posición A, escribe «tieneRazon» + «grado» y el veredicto;
//    el reparto sale de repartirPunto(tieneRazon, grado).
//  - Prompt NUEVO: buildArbitroPrompt de functions/lib/arbitroPrompt.js. SIN anclaje: el modelo NO ve lo que calificó quien
//    preguntó (la Posición A llega sin «(calificó como …)») ni ninguna tabla de reparto; decide SOLO «calificacionRecomendada»
//    y escribe la «evaluacion», la explicación y «Para seguir pensando» sin nombrar a un ganador. El código lee la calificación
//    de quien preguntó de la Posición A, deduce el reparto con resolverRondaOral (la misma función que usa runArbitro) y arma
//    el veredicto («Tiene razón el equipo X» / «Los dos equipos tienen parte de razón» + la evaluación).
//  - 12 casos × 3 corridas × 2 prompts = 72 llamadas (más 1 de prueba de acceso al modelo).
//
// Casos y esperados:
//   Egipto y Mesopotamia (texto base reconstruido, ver TEXTO_EGIPTO_MESOPOTAMIA):
//     fuentes-sinonimos     «escritas, orales, vestigios y arqueológicas»  → razón a quien preguntó, grado parcial
//     cuneiforme-bien       error del cuneiforme bien identificado         → razón a quien respondió, calificación «completa»
//     piramides-esclavos    dato falso «las construyeron esclavos»         → razón total a quien preguntó
//     fuera-de-tema         «¿Quién ganó el Mundial 2022?»                 → fuera de tema (0/0)
//   Lengua e Historia (con texto base):
//     lengua-error-dato, historia-error-dato → razón total a quien preguntó (el dato de la respuesta es falso)
//     historia-borderline → sin resultado fijo: tiene que ser COHERENTE con la calificación que da el árbitro
//                           (la que sale de la tabla: calificación del árbitro contra la de quien preguntó)
//     lengua-borderline   → sin esperado (caso límite); se informa lo que dijo cada prompt
//   Casos NUEVOS de otras áreas (cada uno con un texto base corto, escrito para este script; ver SESIONES):
//     biologia-fotosintesis → «luz, agua y dióxido de carbono», calificada «incompleta» porque «faltó la clorofila». El texto
//                             dice que la clorofila es necesaria → incompleta → razón a quien preguntó, grado parcial
//     matematica-sin-cuenta → «60 km/h», calificada «incompleta» porque «faltó mostrar la cuenta». La consigna no pide el
//                             procedimiento → completa → razón total a quien respondió
//     matematica-error      → «240 km/h», calificada «no» (incorrecta) → razón total a quien preguntó
//     arte-sinonimos        → dos rasgos correctos del impresionismo con otras palabras, calificada «incompleta» porque «no usó
//                             los términos del texto» → razón a quien respondió
//
// Para repetir SOLO un caso dudoso muchas veces (sin las 72 llamadas), agregá antes de `node`:
//   $env:SOLO = "cuneiforme-bien"; $env:REPETICIONES = "10"     (y después Remove-Item Env:SOLO, Env:REPETICIONES)
// Eso escribe scripts\salida\comparacion-reparto-solo.md (no pisa la comparación completa).
//
// CÓMO CORRERLO EN POWERSHELL (la clave queda SOLO en esa ventana; no se guarda en ningún archivo):
//
//   cd C:\Users\pablo_gi29o4o\Desktop\traffic-light-game\traffic-light-game\functions
//   npm run build
//   $k = Read-Host "Clave de Gemini" -AsSecureString
//   $env:GEMINI_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($k))
//   $env:MODELO = "gemini-3.1-flash-lite"      # opcional: si no lo ponés, se usa el de src/config.ts
//   node scripts\comparar-modelos.cjs
//   Remove-Item Env:GEMINI_KEY                  # borra la clave de la ventana al terminar
//
// (Si preferís ver lo que tipeás: $env:GEMINI_KEY = Read-Host "Clave de Gemini" — pero la clave queda a la vista.)
// MODELO_A y MODELO_B (de la comparación anterior entre modelos) ya no se usan: si siguen puestos en la ventana, el script avisa y los ignora.
//
// Salida: scripts\salida\comparacion-reparto.md (criterios de despliegue, tabla resumen por caso y prompt + salidas completas) y
// scripts\salida\comparacion-reparto.json (salidas crudas). La comparación anterior entre modelos
// (comparacion-modelos.md) no se pisa. El script no escribe la clave ni la imprime.
// Antes de las 72 llamadas hace una de prueba: si el modelo da 404 (el nombre no existe en la cuenta) u otro error,
// avisa y termina. Con 429/503 reintenta hasta 2 veces (5 y 15 s).
//
// Cómo se mide cada columna de la tabla resumen (igual para los dos prompts, sobre el reparto FINAL que vería el juego):
//  - Acertó quién tiene razón: «tieneRazon» obtenido = el esperado (en «fuera de tema», «resultado» = fuera_de_tema; en
//    historia-borderline, ver «coherente»). «—» = el caso es un límite y no tiene esperado.
//  - Reparto = esperado: el reparto coincide con el esperado (si el esperado fija el grado, también el grado; en
//    cuneiforme vale cualquiera de los dos grados; en «fuera de tema», 0/0).
//  - Coherente con la calificación del árbitro: «tieneRazon»/«grado» obtenidos = los que da la tabla para (calificación de
//    quien preguntó, «calificacionRecomendada» del modelo). Con el prompt nuevo es verdad por construcción; con el
//    actual mide si el modelo se contradice (p. ej. «incompleta» a favor de quien preguntó, pero razón a quien respondió).
//  - JSON válido: igual que en producción: JSON que se parsea y del que se puede deducir el reparto (si no, el juego
//    muestra «Reintentar»). Una llamada con error de la API cuenta como no válida.
//  - Veredicto contradice el grado: heurística. Si hay razón para uno solo y el grado es «parcial», el veredicto (en el prompt
//    nuevo: la evaluación) o la explicación no pueden decir «incorrecta», «errónea» o «está mal».
//  - Veredicto nombra al equipo correcto: heurística. Con razón a uno, el veredicto nombra primero a ese equipo (o dice
//    «el equipo que preguntó/respondió»); con razón parcial o «ambos», nombra a los dos o dice «ambos», «los dos», «parte de razón».
//    Con el prompt nuevo el veredicto lo arma el código, así que esto se cumple por construcción.
//  - ¿El texto del modelo nombra un ganador? (solo prompt nuevo; heurística): la evaluación, la explicación o «Para seguir
//    pensando» no deberían decir «tiene razón», «gana», etc.: esa frase la pone el código. Lo ideal es 0/3.
//  - Tiempo medio: promedio de las llamadas que no fallaron, en segundos.
//  - Consistencia: ✅ las 3 corridas dieron lo mismo (tieneRazon/grado) · ⚠️ 2 de 3 · ❌ las 3 distintas.
// Las heurísticas se revisan a ojo en las salidas completas (ahí queda marcada la palabra encontrada).
const fs = require("fs");
const path = require("path");
const { buildArbitroPrompt } = require("../lib/arbitroPrompt.js");
const { buildArbitroPrompt: buildPromptActual } = require("./fixtures/prompt-produccion-actual.cjs");
const { repartirPunto, resolverRondaOral, razonPorCalificacion, calificacionDePosicionA, normalizarCalificacion } = require("../lib/arbitroReparto.js");
const { MODELO_GEMINI } = require("../lib/config.js");

// Opcionales (para repetir un caso dudoso sin correr las 72 llamadas): SOLO=cuneiforme-bien (ids separados por coma) y REPETICIONES=10.
const REPETICIONES = Math.max(1, parseInt(process.env.REPETICIONES || "3", 10) || 3);
const SOLO = (process.env.SOLO || "").split(",").map((x) => x.trim()).filter(Boolean);
const GENERATION_CONFIG = { temperature: 0.2, maxOutputTokens: 700 }; // igual que runArbitro

// ── Texto base ───────────────────────────────────────────────────────────────
// RECONSTRUIDO: no tengo el texto base real de la sesión de Egipto y Mesopotamia. Es el de comparar-prompts.cjs con dos
// agregados para que los casos nuevos se puedan decidir con el texto: la categoría «imágenes» (4 categorías de fuentes) y
// una oración sobre quiénes construyeron las pirámides. Para usar el real, reemplazá esta constante (es la única).
const TEXTO_EGIPTO_MESOPOTAMIA = "Las primeras civilizaciones surgieron junto a grandes ríos. En Egipto, el Nilo permitió sembrar y organizar la vida del reino; los egipcios usaron la escritura jeroglífica, grabada en piedra y escrita en papiro. Las pirámides de Guiza se levantaron en el Reino Antiguo como tumbas de los faraones: las construyeron miles de trabajadores egipcios, organizados por el Estado, que recibían alimento y vivienda. En Mesopotamia, entre los ríos Tigris y Éufrates, los sumerios crearon hacia el 3300 a. C. la escritura cuneiforme, que se hacía con una caña sobre tablillas de arcilla húmeda; la escritura cuneiforme no se usó en Egipto. Los historiadores conocen estas civilizaciones a través de cuatro categorías de fuentes. Las fuentes escritas son los documentos: papiros, tablillas e inscripciones. Las fuentes materiales son los objetos y construcciones que dejaron las sociedades: templos, tumbas, herramientas y restos de ciudades. Las fuentes de imágenes son las pinturas, relieves y grabados que muestran cómo era la vida de la época. Las fuentes orales son los relatos transmitidos de generación en generación, que muchas veces se pusieron por escrito mucho después.";
const TEXTO_RECONSTRUIDO = true;

const sesiones = {
  egipto: { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto y Mesopotamia", textoFuente: TEXTO_EGIPTO_MESOPOTAMIA },
  lengua: { materia: "Lengua y Literatura", nivel: "Secundaria", anio: "3", tema: "Crónicas de Indias",
    textoFuente: "Las crónicas de Indias son relatos escritos en el siglo XVI por testigos o historiadores de la conquista de América. Bartolomé de las Casas, fraile dominico, escribió en 1542 la Brevísima relación de la destrucción de las Indias para denunciar ante el rey los abusos de los conquistadores contra los pueblos indígenas y pedir que se los frenara. Otros cronistas, como Bernal Díaz del Castillo, narraron la conquista de México desde la mirada de un soldado que había participado en ella." },
  biologia: { materia: "Biología", nivel: "Secundaria", anio: "3", tema: "La fotosíntesis",
    textoFuente: "La fotosíntesis es el proceso por el cual las plantas fabrican su alimento y liberan oxígeno. Para hacer la fotosíntesis una planta necesita cuatro cosas: luz solar, agua, dióxido de carbono y clorofila. La clorofila es el pigmento verde de las hojas que captura la energía de la luz; sin clorofila la planta no puede aprovechar la luz para fabricar su alimento. El agua llega por las raíces y el dióxido de carbono entra por unos orificios muy pequeños de las hojas llamados estomas. Con esos ingredientes la planta produce glucosa, que usa como alimento, y libera oxígeno al aire." },
  matematica: { materia: "Matemática", nivel: "Secundaria", anio: "2", tema: "Velocidad media",
    textoFuente: "La velocidad media es la relación entre la distancia recorrida y el tiempo empleado en recorrerla: velocidad media = distancia ÷ tiempo. Se expresa en unidades de distancia sobre unidades de tiempo, como kilómetros por hora (km/h) o metros por segundo (m/s). Se llama media porque no tiene en cuenta si el móvil aceleró o frenó durante el viaje: es un valor promedio de todo el recorrido." },
  arte: { materia: "Artes Visuales", nivel: "Secundaria", anio: "3", tema: "El impresionismo",
    textoFuente: "El impresionismo fue un movimiento artístico que surgió en Francia en la segunda mitad del siglo XIX. Pintores como Claude Monet y Pierre-Auguste Renoir querían captar la impresión fugaz de la luz en un momento determinado. Para lograrlo pintaban al aire libre, con pinceladas sueltas y rápidas, y usaban colores puros y luminosos sin mezclarlos demasiado. Elegían escenas de la vida cotidiana y paisajes, y no temas históricos ni religiosos." },
  historia: { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto antiguo",
    textoFuente: "El Nilo fue la base de la civilización egipcia. Cada año sus crecidas depositaban limo fértil en las orillas, lo que permitía sembrar cereales. Los egipcios organizaron su calendario según las etapas del río: inundación, siembra y cosecha. Además, el Nilo era la principal vía de transporte y comunicación. La Gran Pirámide de Guiza fue mandada construir por el faraón Keops (Jufu) hacia el año 2560 a. C. como su tumba." },
};

// ── Casos ────────────────────────────────────────────────────────────────────
// esperado: { razon, grado } (grado null = vale cualquiera) · { fueraDeTema: true } · { coherente: true } · null (sin esperado)
const casos = [
  { id: "fuentes-sinonimos", sesion: "egipto", tipo: "sinónimos", equipoPregunta: "Rojos", equipoResponde: "Azules",
    esperado: { razon: "pregunta", grado: "parcial" },
    desacuerdo: 'Pregunta: "¿Qué tipos de fuentes usan los historiadores para estudiar Egipto y Mesopotamia?"\n\nRespuesta de Azules: "escritas, orales, vestigios y arqueológicas"',
    posicionA: "Rojos (calificó como incompleta): el texto habla de cuatro categorías (escritas, materiales, imágenes y orales) y faltó nombrar las imágenes; además, «vestigios» y «arqueológicas» no son las palabras del texto.",
    posicionB: "Azules (no acepta la calificación): los vestigios y los restos arqueológicos son fuentes materiales; dijimos las categorías con otras palabras, así que la respuesta está completa." },
  { id: "cuneiforme-bien", sesion: "egipto", tipo: "error bien identificado", equipoPregunta: "Azules", equipoResponde: "Rojos",
    esperado: { razon: "responde", grado: null },
    desacuerdo: 'Pregunta: "Identificá el error en esta afirmación: «Los egipcios escribían con escritura cuneiforme sobre tablillas de arcilla.»"\n\nRespuesta de Rojos: "Identificamos que la escritura cuneiforme no es egipcia."',
    posicionA: "Azules (calificó como incompleta): faltó corregir el error: decir cuál era la escritura de los egipcios.",
    posicionB: "Rojos (no acepta la calificación): la consigna pedía identificar el error y dijimos cuál era: el cuneiforme no es egipcio." },
  { id: "piramides-esclavos", sesion: "egipto", tipo: "dato falso", equipoPregunta: "Rojos", equipoResponde: "Azules",
    esperado: { razon: "pregunta", grado: "total" },
    desacuerdo: 'Pregunta: "¿Quiénes construyeron las pirámides de Egipto?"\n\nRespuesta de Azules: "Las pirámides las construyeron esclavos."',
    posicionA: "Rojos (calificó como no): según el texto las construyeron trabajadores egipcios organizados por el Estado, que recibían alimento y vivienda; no eran esclavos.",
    posicionB: "Azules (no acepta la calificación): siempre se dijo que las hicieron esclavos, es lo que se ve en las películas." },
  { id: "fuera-de-tema", sesion: "egipto", tipo: "fuera de tema", equipoPregunta: "Rojos", equipoResponde: "Azules",
    esperado: { fueraDeTema: true },
    desacuerdo: 'Pregunta: "¿Quién ganó el Mundial 2022?"\n\nRespuesta de Azules: "Argentina, con Messi como capitán."',
    posicionA: "Rojos (calificó como incompleta): faltó decir contra quién jugó la final y cómo terminó.",
    posicionB: "Azules (no acepta la calificación): dijimos quién ganó, que era lo que se preguntaba." },
  { id: "lengua-borderline", sesion: "lengua", tipo: "caso límite", equipoPregunta: "Los Lectores", equipoResponde: "Los Cronistas", esperado: null,
    desacuerdo: 'Pregunta: "¿Por qué Bartolomé de las Casas escribió la Brevísima relación de la destrucción de las Indias?"\n\nRespuesta de Los Cronistas: "Para denunciar los abusos de los conquistadores contra los indígenas."',
    posicionA: "Los Lectores (calificó como incompleta): faltó decir a quién le hablaba y para qué: quería convencer al rey de frenar los abusos.",
    posicionB: "Los Cronistas (no acepta la calificación): dijimos el motivo principal, que era denunciar los abusos; el resto es un detalle." },
  { id: "lengua-error-dato", sesion: "lengua", tipo: "error de dato", equipoPregunta: "Los Lectores", equipoResponde: "Los Cronistas",
    esperado: { razon: "pregunta", grado: "total" },
    desacuerdo: 'Pregunta: "¿Qué es una crónica de Indias?"\n\nRespuesta de Los Cronistas: "Es una novela que escribió Cervantes sobre los viajes de Colón."',
    posicionA: "Los Lectores (calificó como no): una crónica de Indias es un relato de testigos o cronistas sobre la conquista y no es una novela.",
    posicionB: "Los Cronistas (no acepta la calificación): igual hablamos de Colón y de los viajes, tendría que valer algo." },
  { id: "historia-borderline", sesion: "historia", tipo: "caso límite", equipoPregunta: "Los Escribas", equipoResponde: "Los Faraones",
    esperado: { coherente: true },
    desacuerdo: 'Pregunta: "¿Por qué el río Nilo fue fundamental para la civilización egipcia?"\n\nRespuesta de Los Faraones: "Porque con sus crecidas dejaba limo fértil y se podía sembrar."',
    posicionA: "Los Escribas (calificó como incompleta): faltó decir que el Nilo también organizaba el calendario y era la vía de transporte.",
    posicionB: "Los Faraones (no acepta la calificación): la razón principal es la agricultura y eso lo dijimos bien." },
  { id: "historia-error-dato", sesion: "historia", tipo: "error de dato", equipoPregunta: "Los Escribas", equipoResponde: "Los Faraones",
    esperado: { razon: "pregunta", grado: "total" },
    desacuerdo: 'Pregunta: "¿Quién mandó construir la Gran Pirámide de Guiza?"\n\nRespuesta de Los Faraones: "La mandó construir Cleopatra para su tumba."',
    posicionA: "Los Escribas (calificó como no): la Gran Pirámide la mandó construir Keops (Jufu), mucho antes de Cleopatra.",
    posicionB: "Los Faraones (no acepta la calificación): Cleopatra es la reina más famosa de Egipto, por algo la dijimos." },
  // ── Casos nuevos (otras áreas) ──
  { id: "biologia-fotosintesis", nuevoCaso: true, sesion: "biologia", tipo: "Biología: falta un elemento del texto", equipoPregunta: "Rojos", equipoResponde: "Azules",
    esperado: { razon: "pregunta", grado: "parcial" },
    desacuerdo: 'Pregunta: "¿Qué necesita una planta para hacer la fotosíntesis?"\n\nRespuesta de Azules: "luz, agua y dióxido de carbono"',
    posicionA: "Rojos (calificó como incompleta): faltó la clorofila: según el texto la planta necesita cuatro cosas y ellos nombraron solo tres.",
    posicionB: "Azules (no acepta la calificación): dijimos lo principal, luz, agua y dióxido de carbono; la clorofila ya está en las hojas, no es algo que la planta tenga que conseguir." },
  { id: "matematica-sin-cuenta", nuevoCaso: true, sesion: "matematica", tipo: "Matemática: resultado correcto sin la cuenta", equipoPregunta: "Rojos", equipoResponde: "Azules",
    esperado: { razon: "responde", grado: "total" },
    desacuerdo: 'Pregunta: "Si un tren recorre 120 km en 2 horas, ¿cuál es su velocidad media?"\n\nRespuesta de Azules: "60 km/h"',
    posicionA: "Rojos (calificó como incompleta): faltó mostrar la cuenta: solo dijeron el resultado.",
    posicionB: "Azules (no acepta la calificación): la pregunta pedía la velocidad media y dijimos el valor correcto con su unidad; no pedía mostrar el procedimiento." },
  { id: "matematica-error", nuevoCaso: true, sesion: "matematica", tipo: "Matemática: resultado incorrecto", equipoPregunta: "Rojos", equipoResponde: "Azules",
    esperado: { razon: "pregunta", grado: "total" },
    desacuerdo: 'Pregunta: "Si un tren recorre 120 km en 2 horas, ¿cuál es su velocidad media?"\n\nRespuesta de Azules: "240 km/h"',
    posicionA: "Rojos (calificó como no): 240 sale de multiplicar 120 por 2; la velocidad media es la distancia dividida por el tiempo: 120 ÷ 2.",
    posicionB: "Azules (no acepta la calificación): son dos horas, por eso multiplicamos; nos pareció que así se calcula." },
  { id: "arte-sinonimos", nuevoCaso: true, sesion: "arte", tipo: "Arte: rasgos correctos con otras palabras", equipoPregunta: "Rojos", equipoResponde: "Azules",
    esperado: { razon: "responde", grado: null },
    desacuerdo: 'Pregunta: "Nombrá dos características de la pintura impresionista."\n\nRespuesta de Azules: "Pintaban afuera, en la naturaleza, y con manchas de color rápidas y sueltas para mostrar cómo cambia la luz."',
    posicionA: "Rojos (calificó como incompleta): no usaron los términos del texto: no dijeron «al aire libre» ni «pinceladas».",
    posicionB: "Azules (no acepta la calificación): dijimos dos características correctas con nuestras palabras: pintar afuera es pintar al aire libre y las manchas rápidas y sueltas son pinceladas sueltas." },
];

// ── Los dos prompts ──────────────────────────────────────────────────────────
const paramsDe = (c) => ({ ...sesiones[c.sesion], subtema: "", ejercicio: "", desacuerdo: c.desacuerdo,
  posicionA: c.posicionA, posicionB: c.posicionB, esJuegoOral: true, equipoPregunta: c.equipoPregunta, equipoResponde: c.equipoResponde });
// Igual que runArbitro: juego oral, nombres de equipos, texto base, sin `contexto` (sin línea de área).
const variantes = [
  { id: "actual", etiqueta: "Prompt actual", descripcion: "lo desplegado hoy: ve la calificación de quien preguntó; el modelo escribe tieneRazon + grado y el veredicto", prompt: (c) => buildPromptActual(paramsDe(c)) },
  { id: "nuevo", etiqueta: "Prompt nuevo", descripcion: "sin anclaje: no ve la calificación de quien preguntó; el modelo decide solo calificacionRecomendada y escribe la evaluación; el código deduce el reparto y arma el veredicto", prompt: (c) => buildArbitroPrompt(paramsDe(c)) },
];

// ── Evaluación de una salida ─────────────────────────────────────────────────
const f = (n) => String(n).replace(".", ",");
const PALABRA_INCORRECTA = /\b(incorrect[ao]s?|err[óo]ne[ao]s?)\b|(?<!lo que )(?<!qu[ée] )\best[áa]n? mal\b/i; // «señalar qué es lo que está mal» no cuenta
const PALABRA_GANADOR = /\b(tiene(?:n)?\s+(?:la\s+)?raz[óo]n|gan[aó]|gan[ao]n|gan[aá]r?on|ganador(?:es)?)\b/i;
const esperadoTxt = (e) => (!e ? "sin esperado (caso límite)" : e.fueraDeTema ? "fuera de tema (0/0)" : e.coherente ? "coherente con la calificación del árbitro (sin resultado fijo)"
  : `razón a ${e.razon === "pregunta" ? "quien preguntó" : "quien respondió"}${e.grado ? `, ${e.grado}` : ", cualquier grado"}`);
const txtReparto = (r) => (!r.valido ? "inválido" : r.fueraDeTema ? "fuera de tema 0/0"
  : `${r.calificacionArbitro ?? "¿?"} → ${r.razon}/${r.grado ?? "—"} ${f(r.reparto.puntosPregunta)}-${f(r.reparto.puntosResponde)}`);
const posicion = (texto, nombre) => { const i = String(texto).toLowerCase().indexOf(String(nombre).toLowerCase()); return i < 0 ? Infinity : i; };

/** ¿El veredicto nombra al equipo que corresponde según el reparto final? (heurística) */
function veredictoNombraBien(c, razon, veredicto) {
  const v = String(veredicto ?? "");
  const p = Math.min(posicion(v, c.equipoPregunta), (/equipo que pregunt/i.exec(v) || { index: Infinity }).index);
  const r = Math.min(posicion(v, c.equipoResponde), (/equipo que respond/i.exec(v) || { index: Infinity }).index);
  if (razon === "pregunta") return p < r;
  if (razon === "responde") return r < p;
  if (razon === "ambos") return (p < Infinity && r < Infinity) || /\b(ambos|ambas|los dos|las dos|parte de razón)\b/i.test(v);
  return null;
}

/** Con razón parcial («Los dos equipos tienen parte de razón») el veredicto tiene que decir que los dos aciertan en algo. */
function veredictoNombraBienConGrado(c, razon, grado, veredicto) {
  if ((razon === "pregunta" || razon === "responde") && grado === "parcial") {
    const v = String(veredicto ?? "");
    return veredictoNombraBien(c, razon, v) === true || /\b(ambos|ambas|los dos|las dos|parte de razón)\b/i.test(v) || (posicion(v, c.equipoPregunta) < Infinity && posicion(v, c.equipoResponde) < Infinity);
  }
  return veredictoNombraBien(c, razon, veredicto);
}

/** Interpreta la salida del modelo con el prompt `variante` y la compara con lo esperado del caso. */
function evaluar(variante, c, texto, error) {
  const base = { jsonValido: false, valido: false, fueraDeTema: false, razon: null, grado: null, reparto: null, calificacionPregunta: null, calificacionArbitro: null,
    acierta: null, repartoOk: null, coherente: null, contradice: false, palabra: null, veredictoOk: null, veredicto: null, nombraGanador: null, json: null, motivo: null };
  if (error) return { ...base, motivo: `error de la API: ${error}` };
  const raw = String(texto).trim().replace(/```json|```/g, "").trim(); // igual que runArbitro
  let j;
  try { j = JSON.parse(raw); } catch { return { ...base, motivo: "no es JSON" }; }
  const r = { ...base, json: j, calificacionPregunta: calificacionDePosicionA(c.posicionA, c.equipoPregunta), calificacionArbitro: normalizarCalificacion(j?.calificacionRecomendada) };

  if (variante.id === "nuevo") {
    const res = resolverRondaOral(j, c.posicionA, c.equipoPregunta, c.equipoResponde); // la función del código (igual que runArbitro)
    if (!res.ok) return { ...r, motivo: `no se pudo deducir el reparto (${res.motivo}; calificacionRecomendada: ${JSON.stringify(j?.calificacionRecomendada ?? null)})` };
    Object.assign(r, { jsonValido: true, valido: true, fueraDeTema: res.valor.fueraDeTema, razon: res.valor.fueraDeTema ? "fuera_de_tema" : res.valor.tieneRazon,
      grado: res.valor.fueraDeTema ? null : res.valor.grado, reparto: res.valor.reparto, veredicto: res.valor.veredicto });
    // El veredicto lo arma el código; el texto que escribió el modelo no debería nombrar a un ganador.
    r.nombraGanador = !res.valor.fueraDeTema && PALABRA_GANADOR.test(`${j.evaluacion ?? ""} ${j.explicacion ?? ""} ${j.paraSeguirPensando ?? ""}`);
  } else if (j && j.resultado === "fuera_de_tema") {
    Object.assign(r, { jsonValido: true, valido: true, fueraDeTema: true, razon: "fuera_de_tema", reparto: { puntosPregunta: 0, puntosResponde: 0 } });
  } else {
    const rep = repartirPunto(j?.tieneRazon, j?.grado); // como el código anterior
    if (!rep) return { ...r, motivo: `tieneRazon/grado ausentes o fuera de las opciones (${JSON.stringify({ tieneRazon: j?.tieneRazon ?? null, grado: j?.grado ?? null })})` };
    Object.assign(r, { jsonValido: true, valido: true, razon: String(j.tieneRazon).trim().toLowerCase(), grado: typeof j.grado === "string" && j.grado.trim() ? j.grado.trim().toLowerCase() : null, reparto: rep, veredicto: j.veredicto });
  }

  // Coherencia con la calificación del árbitro (la tabla del código)
  if (!r.fueraDeTema) {
    const t = razonPorCalificacion(r.calificacionPregunta, r.calificacionArbitro);
    r.coherente = !!t && t.tieneRazon === r.razon && t.grado === (r.grado ?? "parcial");
  }
  // Esperado del caso
  const e = c.esperado;
  if (e) {
    if (e.fueraDeTema) {
      r.acierta = r.fueraDeTema;
      r.repartoOk = r.fueraDeTema && r.reparto.puntosPregunta === 0 && r.reparto.puntosResponde === 0;
    } else if (e.coherente) {
      r.acierta = r.repartoOk = r.coherente === true;
    } else {
      r.acierta = !r.fueraDeTema && r.razon === e.razon;
      const aceptados = (e.grado ? [e.grado] : ["total", "parcial"]).map((g) => repartirPunto(e.razon, g));
      r.repartoOk = !r.fueraDeTema && aceptados.some((x) => x && x.puntosPregunta === r.reparto.puntosPregunta && x.puntosResponde === r.reparto.puntosResponde);
    }
  }
  if (!r.fueraDeTema) {
    if ((r.razon === "pregunta" || r.razon === "responde") && r.grado === "parcial") {
      const m = `${variante.id === "nuevo" ? (j.evaluacion ?? "") : (j.veredicto ?? "")} ${j.explicacion ?? ""}`.match(PALABRA_INCORRECTA);
      if (m) { r.contradice = true; r.palabra = m[0]; }
    }
    r.veredictoOk = veredictoNombraBienConGrado(c, r.razon, r.grado, r.veredicto);
  }
  return r;
}

const moda = (xs) => { const m = {}; xs.forEach((x) => (m[x] = (m[x] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1])[0] || ["", 0]; };
const consistencia = (corridas) => {
  const claves = corridas.map((x) => (x.valido ? (x.fueraDeTema ? "fuera_de_tema" : `${x.razon}/${x.grado ?? ""}`) : "inválido"));
  const [, n] = moda(claves);
  if (claves.length === 3) return n === 3 ? "✅ las 3 iguales" : n === 2 ? "⚠️ 2 de 3" : "❌ las 3 distintas";
  return n === claves.length ? `✅ las ${claves.length} iguales` : `⚠️ ${n} de ${claves.length} coinciden`;
};
const nDe = (xs, fn) => xs.filter(fn).length;
const seg = (ms) => `${f((ms / 1000).toFixed(2))} s`;
const promedioMs = (xs) => { const ok = xs.filter((x) => !x.error); return ok.length ? ok.reduce((a, x) => a + x.ms, 0) / ok.length : null; };
const nTotal = (n, total) => `${n}/${total}`;
const conSiNo = (xs, campo, total = xs.length) => nTotal(nDe(xs, (x) => x[campo] === true), total);

// ── Llamada a Gemini (reintenta 429/503; nunca se imprime la clave) ───────────
const esperasReintento = () => (process.env.COMPARAR_ESPERAS_MS || "5000,15000").split(",").map(Number);
function mensajeSeguro(e) {
  return String(e?.message || e).replace(/^.*?\]:?\s*/, "").replace(/^Error fetching from\s+\S+?:\s+/i, "").replace(/AIza[0-9A-Za-z_-]{20,}/g, "[clave]").replace(/([?&]key=)[^&\s]+/gi, "$1[clave]").slice(0, 200);
}
async function gemini(modelo, prompt, config = GENERATION_CONFIG) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const model = new GoogleGenerativeAI(process.env.GEMINI_KEY).getGenerativeModel({ model: modelo });
  const esperas = esperasReintento();
  for (let intento = 0; ; intento++) {
    const t0 = Date.now();
    try {
      const r = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: config });
      return { texto: r.response.text(), ms: Date.now() - t0 };
    } catch (e) {
      const st = e?.status;
      if ((st === 429 || st === 503) && intento < esperas.length) { await new Promise((res) => setTimeout(res, esperas[intento])); continue; }
      return { texto: "", status: st ?? null, error: `${st ?? "red"}: ${mensajeSeguro(e)}`, ms: Date.now() - t0 };
    }
  }
}

// ── Informe ──────────────────────────────────────────────────────────────────
/** Los criterios que fijó Pablo para decidir el despliegue, calculados sobre el prompt NUEVO (y, al lado, el actual). */
function criteriosDeDespliegue(resultados) {
  const caso = (id) => casos.find((c) => c.id === id);
  const n = (id, vid, fn) => resultados[id][vid].filter(fn).length;
  const filas = [];
  const fila = (texto, nuevo, actual, ok) => filas.push({ texto, nuevo, actual, ok });
  const fijos = casos.filter((c) => c.esperado && !c.esperado.coherente && !c.nuevoCaso);
  const total = (vid, fn) => fijos.reduce((a, c) => a + n(c.id, vid, fn), 0);
  const tot = fijos.length * REPETICIONES;
  fila(`«Acertó quién tiene razón» en los ${fijos.length} casos fijos anteriores: ${tot}/${tot}`, `${total("nuevo", (x) => x.acierta)}/${tot}`, `${total("actual", (x) => x.acierta)}/${tot}`, total("nuevo", (x) => x.acierta) === tot);
  fila("`cuneiforme-bien`: razón a quien respondió en todas las corridas", `${n("cuneiforme-bien", "nuevo", (x) => x.acierta)}/${REPETICIONES}`, `${n("cuneiforme-bien", "actual", (x) => x.acierta)}/${REPETICIONES}`, n("cuneiforme-bien", "nuevo", (x) => x.acierta) === REPETICIONES);
  fila("`cuneiforme-bien`: el árbitro dice «completa» en todas las corridas", `${n("cuneiforme-bien", "nuevo", (x) => x.calificacionArbitro === "completa")}/${REPETICIONES}`, `${n("cuneiforme-bien", "actual", (x) => x.calificacionArbitro === "completa")}/${REPETICIONES}`, n("cuneiforme-bien", "nuevo", (x) => x.calificacionArbitro === "completa") === REPETICIONES);
  fila("`fuentes-sinonimos` (no se pierde): razón a quien preguntó, parcial, en todas las corridas", `${n("fuentes-sinonimos", "nuevo", (x) => x.acierta && x.repartoOk)}/${REPETICIONES}`, `${n("fuentes-sinonimos", "actual", (x) => x.acierta && x.repartoOk)}/${REPETICIONES}`, n("fuentes-sinonimos", "nuevo", (x) => x.acierta && x.repartoOk) === REPETICIONES);
  for (const id of ["biologia-fotosintesis", "matematica-sin-cuenta", "matematica-error", "arte-sinonimos"]) {
    const ok = n(id, "nuevo", (x) => x.acierta && x.repartoOk);
    fila(`\`${id}\`: ${esperadoTxt(caso(id).esperado)}, en todas las corridas`, `${ok}/${REPETICIONES}`, `${n(id, "actual", (x) => x.acierta && x.repartoOk)}/${REPETICIONES}`, ok === REPETICIONES);
  }
  let md = `\n## Criterios para decidir el despliegue (prompt nuevo)\n\n| Criterio | Prompt nuevo | Prompt actual | ¿Se cumple? |\n|---|---|---|---|\n`;
  for (const f of filas) md += `| ${f.texto} | ${f.nuevo} | ${f.actual} | ${f.ok ? "✅" : "❌"} |\n`;
  md += `\n**${filas.every((f) => f.ok) ? "Se cumplen todos los criterios." : `No se cumplen todos los criterios (${filas.filter((f) => !f.ok).length} de ${filas.length} fallan): no se despliega así.`}** Los esperados de los casos nuevos son los que salen del texto base corto escrito para cada uno (ver \`sesiones\` en el script).\n`;
  return md;
}

function informe({ modelo, resultados, avisos }) {
  let md = `# Comparación de prompts del árbitro: actual vs nuevo (sin anclaje)\n\n`;
  md += `- **Modelo (los dos prompts):** \`${modelo}\`\n`;
  for (const v of variantes) md += `- **${v.etiqueta}:** ${v.descripcion}\n`;
  md += `- Juego oral, con nombres de equipos y texto base, sin línea de área. Temperatura 0,2 · 700 tokens · ${REPETICIONES} corridas por caso y prompt. Reparto con \`repartirPunto\`; con el prompt nuevo, además, \`resolverRondaOral\` (la función de \`runArbitro\`).\n`;
  md += `- Generado: ${new Date().toISOString()}\n`;
  if (TEXTO_RECONSTRUIDO) md += `- ⚠️ El texto base de Egipto y Mesopotamia es una **reconstrucción** (ver \`TEXTO_EGIPTO_MESOPOTAMIA\` en el script), no el de la sesión real.\n`;
  md += `- ℹ️ Los textos base de los 4 casos nuevos (Biología, Matemática ×2, Arte) los escribí para este script; los esperados salen de esos textos (ver \`sesiones\`).\n`;
  if (SOLO.length || REPETICIONES !== 3) md += `- ℹ️ Corrida parcial: ${SOLO.length ? `solo los casos ${SOLO.join(", ")}` : "todos los casos"} con ${REPETICIONES} corridas por caso y prompt (variables SOLO / REPETICIONES). No es la comparación completa: no hay tabla de criterios de despliegue.\n`;
  for (const a of avisos) md += `- ⚠️ ${a}\n`;

  if (!SOLO.length) md += criteriosDeDespliegue(resultados); // con SOLO no están todos los casos: no hay criterios que evaluar
  md += `\n## Resumen por caso y prompt\n\n`;
  md += `| Caso | Prompt | Esperado | ¿Acertó quién tiene razón? | ¿Reparto = esperado? | ¿Coherente con la calificación del árbitro? | JSON válido | ¿Veredicto contradice el grado? | ¿Veredicto nombra al equipo correcto? | ¿El texto del modelo nombra un ganador? (solo nuevo; ideal 0) | Tiempo medio | Consistencia | Obtenido (corridas 1 · 2 · 3) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const c of casos) {
    for (const v of variantes) {
      const xs = resultados[c.id][v.id];
      const pm = promedioMs(xs);
      const sinFueraDeTema = xs.filter((x) => !x.fueraDeTema);
      md += `| ${c.id} | ${v.etiqueta} | ${esperadoTxt(c.esperado)} | ${c.esperado ? conSiNo(xs, "acierta") : "—"} | ${c.esperado ? conSiNo(xs, "repartoOk") : "—"} | ${c.esperado?.fueraDeTema ? "—" : conSiNo(xs, "coherente")} | ${nTotal(nDe(xs, (x) => x.jsonValido), REPETICIONES)} | ${nTotal(nDe(xs, (x) => x.contradice), REPETICIONES)} | ${c.esperado?.fueraDeTema ? "—" : nTotal(nDe(sinFueraDeTema, (x) => x.veredictoOk === true), REPETICIONES)} | ${v.id === "nuevo" && !c.esperado?.fueraDeTema ? nTotal(nDe(xs, (x) => x.nombraGanador === true), REPETICIONES) : "—"} | ${pm === null ? "—" : seg(pm)} | ${consistencia(xs)} | ${xs.map(txtReparto).join(" · ")} |\n`;
    }
  }
  md += `\nFormato de «Obtenido»: calificación del árbitro → tieneRazon/grado y el reparto puntos de quien preguntó-puntos de quien respondió. «—» = no aplica (caso límite sin esperado, o fuera de tema). Cómo se mide cada columna: ver el encabezado del script.\n`;

  const fijos = casos.filter((c) => c.esperado && !c.esperado.coherente && !c.nuevoCaso); // los 6 casos fijos anteriores
  const nuevosCasos = casos.filter((c) => c.nuevoCaso);                                       // los 4 casos nuevos
  const conEsperado = casos.filter((c) => c.esperado);
  const sinFuera = casos.filter((c) => !c.esperado?.fueraDeTema);
  const de = (cs, vid) => cs.flatMap((c) => resultados[c.id][vid]);
  md += `\n## Totales por prompt\n\n| Prompt | Acertó quién tiene razón (${fijos.length} casos fijos anteriores, ${fijos.length * REPETICIONES} corridas) | Acertó (${nuevosCasos.length} casos nuevos, ${nuevosCasos.length * REPETICIONES} corridas) | …los ${conEsperado.length} casos con esperado, incluyendo historia-borderline (coherencia) | Reparto = esperado (${conEsperado.length} casos) | Coherente con la calificación del árbitro (${sinFuera.length} casos, sin fuera de tema) | JSON válido | Veredicto contradice el grado | Veredicto nombra al equipo correcto | Texto del modelo nombra un ganador (solo nuevo) | Casos con las 3 corridas iguales | Tiempo medio | Llamadas con error |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const v of variantes) {
    const todas = de(casos, v.id), iguales = casos.filter((c) => consistencia(resultados[c.id][v.id]).startsWith("✅")).length, pm = promedioMs(todas);
    const sf = de(sinFuera, v.id);
    md += `| ${v.etiqueta} | ${conSiNo(de(fijos, v.id), "acierta")} | ${conSiNo(de(nuevosCasos, v.id), "acierta")} | ${conSiNo(de(conEsperado, v.id), "acierta")} | ${conSiNo(de(conEsperado, v.id), "repartoOk")} | ${conSiNo(sf, "coherente")} | ${nTotal(nDe(todas, (x) => x.jsonValido), todas.length)} | ${nTotal(nDe(todas, (x) => x.contradice), todas.length)} | ${nTotal(nDe(sf, (x) => x.veredictoOk === true), sf.length)} | ${v.id === "nuevo" ? nTotal(nDe(sf, (x) => x.nombraGanador === true), sf.length) : "—"} | ${nTotal(iguales, casos.length)} | ${pm === null ? "—" : seg(pm)} | ${nDe(todas, (x) => x.error) } |\n`;
  }
  md += `\n## Salidas completas\n\nCada bloque es el texto tal como lo devolvió el modelo (antes de interpretarlo).\n`;
  for (const c of casos) {
    md += `\n### ${c.id} — ${sesiones[c.sesion].tema} (${c.tipo})\n\nPreguntó **${c.equipoPregunta}**, respondió **${c.equipoResponde}**. Esperado: ${esperadoTxt(c.esperado)}.\n\n${c.desacuerdo}\n\n- ${c.posicionA}\n- ${c.posicionB}\n`;
    for (const v of variantes) {
      resultados[c.id][v.id].forEach((x, i) => {
        const marcas = [];
        if (x.error) marcas.push("⚠️ ERROR"); else if (!x.jsonValido) marcas.push("❌ JSON inválido o sin reparto");
        if (x.acierta === true) marcas.push("acertó ✅"); else if (x.acierta === false) marcas.push("no acertó ❌");
        if (x.repartoOk === false) marcas.push("reparto ≠ esperado");
        if (x.coherente === false) marcas.push("⚠️ NO coherente con su calificación");
        if (x.contradice) marcas.push(`⚠️ contradice el grado («${x.palabra}»)`);
        if (x.veredictoOk === false) marcas.push("⚠️ el veredicto no nombra al equipo correcto");
        if (x.nombraGanador === true) marcas.push("⚠️ el texto del modelo nombra un ganador");
        md += `\n#### ${v.etiqueta} · corrida ${i + 1} — ${txtReparto(x)} — ${x.ms} ms${marcas.length ? ` — ${marcas.join(" · ")}` : ""}\n\n`;
        md += x.error ? `${x.motivo}\n` : (x.motivo ? `${x.motivo}\n\n` : "") + `~~~~\n${String(x.texto).trim()}\n~~~~\n`;
        if (v.id === "nuevo" && x.veredicto) md += `\nVeredicto que arma el código: «${x.veredicto}»\n`;
      });
    }
  }
  return md;
}

// ── Principal ────────────────────────────────────────────────────────────────
async function main() {
  const dir = process.env.COMPARAR_SALIDA || path.join(__dirname, "salida");
  const modelo = process.env.MODELO || MODELO_GEMINI;
  fs.mkdirSync(dir, { recursive: true });
  if (SOLO.length) {
    const faltan = SOLO.filter((id) => !casos.some((c) => c.id === id));
    if (faltan.length) { console.log(`SOLO: no existe(n) el/los caso(s) ${faltan.join(", ")}. Casos válidos: ${casos.map((c) => c.id).join(", ")}.`); return { ok: false, motivo: "SOLO inválido" }; }
    casos.splice(0, casos.length, ...casos.filter((c) => SOLO.includes(c.id)));
  }
  const nombreSalida = SOLO.length ? "comparacion-reparto-solo" : "comparacion-reparto";
  if (!process.env.GEMINI_KEY) {
    for (const c of casos) for (const v of variantes) fs.writeFileSync(path.join(dir, `${c.id}.prompt-${v.id}.txt`), v.prompt(c));
    console.log("Falta GEMINI_KEY. Solo escribí los prompts (actual y nuevo) en scripts/salida/. Mirá el encabezado del script para correrlo en PowerShell.");
    return { ok: false, motivo: "falta la clave" };
  }
  if (process.env.MODELO_A || process.env.MODELO_B) console.log("Aviso: MODELO_A y MODELO_B ya no se usan (quedaron puestos en esta ventana de una comparación anterior). Los dos prompts corren con MODELO o, si no está, con src/config.ts.");

  // Aviso si la compilación está vieja respecto del código fuente (el prompt y el reparto que se prueban son los de lib/).
  const avisos = [];
  for (const nombre of ["arbitroPrompt", "arbitroReparto", "config"]) {
    try {
      const fuente = fs.statSync(path.join(__dirname, "..", "src", `${nombre}.ts`)).mtimeMs;
      const compilado = fs.statSync(path.join(__dirname, "..", "lib", `${nombre}.js`)).mtimeMs;
      if (compilado + 2000 < fuente) avisos.push(`functions/lib/${nombre}.js es más viejo que src/${nombre}.ts: corré \`npm run build\` para probar el código actual.`);
    } catch { /* sin src/ o sin lib/: nada que comparar */ }
  }
  avisos.forEach((a) => console.log("Aviso: " + a));

  console.log(`Modelo: ${modelo}\nPrueba de acceso al modelo…`);
  const prueba = await gemini(modelo, 'Respondé solo con la palabra "ok".', { temperature: 0, maxOutputTokens: 20 });
  if (prueba.error) {
    console.log(`✖ El modelo (${modelo}) devolvió ${prueba.error}.${prueba.status === 404 ? " Ese nombre no existe en tu cuenta: buscá el nombre correcto en la lista de modelos de AI Studio." : ""}\nNo hice las demás llamadas.`);
    return { ok: false, motivo: `modelo ${prueba.status ?? "error"}`, modelo, status: prueba.status };
  }

  console.log(`${casos.length} casos × ${REPETICIONES} corridas × ${variantes.length} prompts = ${casos.length * REPETICIONES * variantes.length} llamadas…`);
  const resultados = {};
  for (const c of casos) {
    resultados[c.id] = Object.fromEntries(variantes.map((v) => [v.id, []]));
    for (let i = 0; i < REPETICIONES; i++) {
      for (const v of variantes) {
        const o = await gemini(modelo, v.prompt(c));
        resultados[c.id][v.id].push({ ...o, ...evaluar(v, c, o.texto, o.error) });
      }
      process.stdout.write(".");
    }
    process.stdout.write(` ${c.id}\n`);
  }

  const md = informe({ modelo, resultados, avisos });
  const salidaMd = path.join(dir, nombreSalida + ".md");
  fs.writeFileSync(salidaMd, md);
  fs.writeFileSync(path.join(dir, nombreSalida + ".json"), JSON.stringify({ modelo, textoReconstruido: TEXTO_RECONSTRUIDO, casos: casos.map(({ id, tipo, esperado }) => ({ id, tipo, esperado })), resultados }, null, 2));
  console.log("Listo: " + salidaMd);
  return { ok: true, salidaMd, resultados };
}

if (require.main === module) {
  main().then((r) => { if (!r.ok) process.exitCode = 1; }).catch((e) => { console.error("Error:", mensajeSeguro(e)); process.exitCode = 1; });
}
module.exports = { main, casos, sesiones, variantes, paramsDe, evaluar, informe, TEXTO_EGIPTO_MESOPOTAMIA };
