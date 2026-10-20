// Resumen de una línea de "Opciones de la sesión" (paso 7 de ArbitroConfigPage), para mostrarlo con el
// acordeón plegado por defecto — Etapa D de "pantalla de configuración de los Árbitros". Separado en un
// util (en vez de quedar como función interna del componente) para poder probarlo sin renderizar la
// pantalla: ver functions/scripts/verificar-etapa-d-config.cjs.
import type { TranslationKeys } from "../i18n/es";
import { fillArbitro } from "../i18n";
import type { ModoMetacognicion } from "./arbitroIntegrantes";

export interface ResumenOpcionesSesionInput {
  duracion: "clase" | "dia";
  /** Segundos; 0 = sin límite por ronda. */
  tiempoPregunta: number;
  permitirPreguntasPropias: boolean;
  modoMetacognicion: ModoMetacognicion;
  /** true si el docente cambió las preguntas de metacognición (ver preguntasParaGuardar en ArbitroConfigPage). */
  preguntasMetaEditadas: boolean;
  /** Cantidad de criterios de calificación que se van a guardar (0 a MAX_CRITERIOS). */
  nCriterios: number;
}

export function resumenOpcionesSesion(ta: TranslationKeys["arbitro"], opts: ResumenOpcionesSesionInput): string {
  const partes: string[] = [];
  partes.push(opts.duracion === "clase" ? ta.cfgOptsSummaryClass : ta.cfgOptsSummaryDay);
  partes.push(opts.tiempoPregunta === 0 ? ta.cfgOptsSummaryNoRoundLimit : fillArbitro(ta.cfgOptsSummaryRoundMin, { n: opts.tiempoPregunta / 60 }));
  partes.push(opts.permitirPreguntasPropias ? ta.cfgOptsSummaryOwnYes : ta.cfgOptsSummaryOwnNo);
  partes.push(opts.modoMetacognicion === "grupal" ? ta.cfgOptsSummaryMetaGroup : ta.cfgOptsSummaryMetaIndividual);
  if (opts.preguntasMetaEditadas) partes.push(ta.cfgOptsSummaryMetaQEdited);
  partes.push(
    opts.nCriterios === 0 ? ta.cfgOptsSummaryNoCriteria
      : opts.nCriterios === 1 ? ta.cfgOptsSummaryOneCriterion
      : fillArbitro(ta.cfgOptsSummaryCriteriaN, { n: opts.nCriterios }),
  );
  return partes.join(" · ");
}
