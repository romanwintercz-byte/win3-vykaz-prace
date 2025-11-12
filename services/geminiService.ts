import { GoogleGenAI } from "@google/genai";
import { ReportData } from '../types';

export const generateReportSummary = async (ai: GoogleGenAI, data: ReportData): Promise<string> => {
    const prompt = `
    Jsi analytik pro controlling a HR. Tvým úkolem je vytvořit profesionální shrnutí měsíčního výkazu práce pro management.
    Shrnutí musí být v češtině.

    Na základě následujících dat ve formátu JSON vygeneruj souhrnný report. 
    Data obsahují seznam projektů a denní záznamy, kde 'projectId' v denních záznamech odkazuje na 'id' v seznamu projektů.
    Data: ${JSON.stringify(data, null, 2)}

    Ve svém shrnutí se zaměř na následující body:
    1.  Celkový počet odpracovaných hodin a přesčasů.
    2.  Analýza rozložení práce mezi jednotlivé projekty/činnosti. Použij názvy projektů ze seznamu 'projects'. Uveď, které projekty byly nejvíce časově náročné.
    3.  Přehled absencí (dovolená, nemoc, atd.).
    4.  Případné anomálie nebo zajímavé postřehy (např. vysoký počet přesčasů v určitém období, koncentrace práce na jeden projekt atd.).

    Výstup formátuj jako stručný a přehledný text. Nepoužívej Markdown. Buď věcný a profesionální.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Nepodařilo se vygenerovat shrnutí pomocí AI. Zkuste to prosím znovu.");
    }
};