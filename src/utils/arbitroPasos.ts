import type { TranslationKeys } from "../i18n/es";

// Los seis pasos de la dinámica de los Árbitros (los usan ArbitrosInfoPage y la portada pública /arbitros).
export function pasosArbitro(ta: TranslationKeys["arbitro"]): { n: string; txt: string }[] {
  return [
    { n: "1", txt: ta.infStep1 },
    { n: "2", txt: ta.infStep2 },
    { n: "3", txt: ta.infStep3 },
    { n: "4", txt: ta.infStep4 },
    { n: "5", txt: ta.rulesStep5Info },
    { n: "6", txt: ta.infStep6 },
  ];
}
