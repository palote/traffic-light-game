// Se carga con «node -r» para probar probar-casos-arbitro.cjs SIN llamar al modelo real: el modelo simulado siempre responde «completa».
const Module = require("module");
const load = Module._load;
class FakeAI { getGenerativeModel() { return { generateContent: async () => ({ response: { text: () => JSON.stringify({ resultado: "A", elementosClave: "e", calificacionRecomendada: "completa", evaluacion: "The answer is correct and covers what the question asked for.", explicacion: "The answer shows the concept and it is explained clearly for the group.", paraSeguirPensando: "Why does this concept matter for the topic?" }) } }) }; } }
Module._load = function (r, ...a) { if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
