
import { GoogleGenAI, Type } from "@google/genai";
import { SalesAnalysis, MXRecordInfo } from '../types';

// Initialize Gemini
// NOTE: Process.env.API_KEY is assumed to be injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-flash';

export const analyzeDomainWithGemini = async (
  domain: string, 
  mxInfo: MXRecordInfo,
  focusAreas: string[] = []
): Promise<SalesAnalysis> => {
  
  // Lógica de enfoque: Si hay selección, forzamos un análisis vertical profundo.
  const isStrict = focusAreas.length > 0;

  const focusContext = isStrict 
    ? `
    *** MODO DE ENFOQUE VERTICAL ESTRICTO ACTIVADO ***
    TEMAS SELECCIONADOS: ${focusAreas.join(', ')}.

    DIRECTRIZ PRINCIPAL:
    El usuario NO quiere un análisis general de la empresa. Quiere saber específicamente qué productos de las verticales seleccionadas ("${focusAreas.join(', ')}") encajan con este cliente.

    REGLAS DE FILTRADO DE PRODUCTOS (OBLIGATORIAS):
    1. EXCLUSIVIDAD VERTICAL (CRÍTICO):
       - NO recomiendes productos genéricos (como Gmail básico, Docs, Sheets) tratando de "venderlos" como solución al tema seleccionado.
       - Recomienda EXCLUSIVAMENTE herramientas especializadas de la vertical seleccionada.

    2. PORTAFOLIO ESPECÍFICO POR TEMA (EJEMPLOS):
       - Si el tema es "Ciberseguridad": Céntrate en el portafolio de seguridad avanzado de Google. DEBES considerar: Google Chronicle (SIEM/SOAR), Security Command Center, Mandiant Threat Intelligence, BeyondCorp Enterprise, reCAPTCHA Enterprise, VirusTotal, Assured Workloads, DLP (Data Loss Prevention).
       - Si el tema es "Google Maps & Geo": Céntrate en Google Maps Platform (Places API, Routes API, Solar API, Aerial View, Address Validation).
       - Si el tema es "Cloud & Infraestructura": Céntrate en Google Cloud Platform (Compute Engine, GKE, Anthos/Google Distributed Cloud, BigQuery, Apigee).
       - Si el tema es "Workspace & Colaboración": Aquí sí puedes hablar de Gemini for Workspace, AppSheet, y las ediciones Enterprise/Business Plus.

    3. ANÁLISIS TÉCNICO:
       - Justifica la recomendación basándote en la naturaleza del dominio (ej. si es un banco -> Mandiant/Compliance; si es retail -> Maps/Places).

    4. ELEVATOR PITCH TEMÁTICO:
       - El pitch debe ignorar aspectos generales del negocio y atacar directamente el dolor de la vertical seleccionada (ej. "Protege tus activos digitales..." en vez de "Mejora tu productividad...").

    5. PRODUCTOS SERVINFORMACIÓN:
       - Solo incluye productos de Servinformación si son estrictamente relevantes para los temas seleccionados.
    `
    : `
    MODO GENERAL (SIN ENFOQUE):
    - Realiza un análisis comercial holístico (360 grados).
    - Busca la oportunidad más clara ("Low hanging fruit").
    - Ej: Si no tienen correo profesional -> Workspace. Si es retail -> Mapas/Infocomercio.
    `;

  const systemInstruction = `
    Actúa como un experto arquitecto de soluciones y vendedor B2B senior para "Servinformación", Partner Premier de Google Cloud.
    
    Tu objetivo es analizar un dominio web y construir una propuesta de valor altamente técnica y comercial.
    
    Portafolio Servinformación para referencia:
    - Datarutas: Optimización logística.
    - Sitidata: Inteligencia de locación y Big Data.
    - Infocomercio: Data de comercios.
    - Servipunto: Puntos de venta.

    Regla de Oro:
    Calidad sobre cantidad. Prefiero 3 recomendaciones muy acertadas, técnicas y específicas al tema seleccionado, que 10 genéricas.
  `;

  const prompt = `
    Analiza el dominio objetivo: ${domain}.
    
    Contexto Técnico Detectado:
    - Proveedor de Correo Actual (MX): ${mxInfo.providerName}
    - ¿Ya es cliente de Google Workspace?: ${mxInfo.isGoogleWorkspace ? 'SÍ (Enfocarse en Upselling / Cloud / Seguridad)' : 'NO (Oportunidad de Migración)'}

    ${focusContext}

    Genera una respuesta JSON estructurada que incluya un "emailProposal".
    
    REGLAS CRÍTICAS PARA EL CORREO (EMAIL PROPOSAL):
    1. EXTENSIÓN: MÁXIMO 4 o 5 líneas de texto en el cuerpo. Debe ser leíble en 10 segundos.
    2. ESTRUCTURA OBLIGATORIA:
       - Entrada: 1 línea conectando con su negocio o industria.
       - Cuerpo: 2 líneas explicando cómo la solución elimina un dolor específico.
       - Cierre (Call to Action): 1 línea solicitando explícitamente un espacio de reunión (reunión, call, café virtual).
    3. ESTILO: Minimalista, directo y persuasivo. Sin saludos largos ni despedidas formales innecesarias.

    Genera una respuesta JSON estructurada.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING, description: "Nombre estimado de la empresa" },
            industry: { type: Type.STRING, description: "Industria o sector de la empresa" },
            summary: { type: Type.STRING, description: "Breve resumen de la empresa" },
            elevatorPitch: { type: Type.STRING, description: "Discurso de venta persuasivo y adaptado estrictamente al enfoque solicitado." },
            emailProposal: {
              type: Type.OBJECT,
              description: "Propuesta de correo electrónico ultra-breve",
              properties: {
                subject: { type: Type.STRING, description: "Asunto del correo, atractivo y corto (máx 5-7 palabras)" },
                body: { type: Type.STRING, description: "Cuerpo del correo extremadamente conciso (máx 5 líneas) con CTA de reunión." }
              }
            },
            googleProducts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nombre del producto específico (ej. Chronicle, no solo 'Seguridad')" },
                  description: { type: Type.STRING },
                  reason: { type: Type.STRING, description: "Justificación técnica/comercial específica" },
                  howToOffer: { type: Type.STRING, description: "Frase de enganche (Hook)" }
                }
              }
            },
            servinformacionProducts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  howToOffer: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as SalesAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("No se pudo generar el análisis de ventas. Intente nuevamente.");
  }
};
