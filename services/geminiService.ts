import { GoogleGenAI } from "@google/genai";
import { ReportData } from '../types';

export const generateReportSummary = async (ai: GoogleGenAI, data: ReportData): Promise<string> => {
    const prompt = `
Jsi analytik pro controlling a HR. Tvým úkolem je vytvořit profesionální shrnutí měsíčního výkazu práce pro management.
Shrnutí musí být v češtině.

Na základě následujících dat ve formátu JSON vygeneruj souhrnný report.
Data obsahují seznam projektů, seznam absencí a denní záznamy ('days').
Každý denní záznam v poli 'days' má jednoduchou strukturu a obsahuje:
- 'hours': odpracované hodiny
- 'overtime': hodiny přesčasů
- 'projectId': ID projektu, které odkazuje na 'id' z hlavního seznamu 'projects'.
- 'absenceId': ID absence, které odkazuje na 'id' z hlavního seznamu 'absences'.
- 'absenceHours': počet hodin absence pro daný den.

Jeden den může obsahovat jak odpracované hodiny, tak hodiny absence.

Data: ${JSON.stringify(data, null, 2)}
Ve svém shrnutí se zaměř na následující body:
1.  Celkový počet odpracovaných hodin a přesčasů za celý měsíc.
2.  Analýza rozložení práce mezi jednotlivé projekty/činnosti. Použij názvy projektů ze seznamu 'projects'. Uveď, které projekty byly nejvíce časově náročné.
3.  Přehled absencí (dovolená, nemoc, atd.) a jejich celkový součet v hodinách. Použij názvy ze seznamu 'absences' a hodnoty z 'absenceHours'.
4.  Případné anomálie nebo zajímavé postřehy (např. vysoký počet přesčasů, koncentrace práce na jeden projekt, neobvyklé absence atd.).
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