import { GoogleGenAI } from "@google/genai";
import { ReportData } from '@/types';

export const generateReportSummary = async (ai: GoogleGenAI, data: ReportData): Promise<string> => {
const prompt = `
Jsi analytik pro controlling a HR. Tvým úkolem je vytvořit profesionální shrnutí měsíčního výkazu práce pro management.
Shrnutí musí být v češtině.

Na základě následujících dat ve formátu JSON vygeneruj souhrnný report.
Data obsahují seznam projektů, absencí a denních záznamů. Klíč 'days' obsahuje pole, kde každý objekt reprezentuje jeden den. V rámci dne je pole 'entries', které obsahuje všechny jednotlivé činnosti (práce, absence, nebo pauza) pro daný den. Každá činnost má 'startTime' a 'endTime'.

Data: ${JSON.stringify(data, null, 2)}

Vypočítej celkový počet odpracovaných hodin a přesčasů. Běžná pracovní doba je 8 hodin denně. Cokoliv nad 8 hodin za den je přesčas.
Ve svém shrnutí se zaměř na následující body:
1.  Celkový počet odpracovaných hodin a celkový počet přesčasů za celý měsíc.
2.  Analýza rozložení práce mezi jednotlivé projekty/činnosti. Použij názvy projektů ze seznamu 'projects'. Uveď, které projekty byly nejvíce časově náročné.
3.  Přehled absencí. Použij názvy absencí ze seznamu 'absences' a sečti hodiny pro každý typ.
4.  Případné anomálie nebo zajímavé postřehy (např. vysoký počet přesčasů v určitém období, koncentrace práce na jeden projekt, časté absence určitého typu atd.).

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