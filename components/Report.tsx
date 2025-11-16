import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ReportData } from '@/types';
import { generateReportSummary } from '@/services/geminiService';
import { calculateDuration } from '@/utils/timeUtils';

interface ReportProps {
    reportData: ReportData;
    ai: GoogleGenAI;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-700"></div>
    </div>
);

export const Report = React.forwardRef<HTMLDivElement, ReportProps>(({ reportData, ai }, ref) => {
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handlePrint = () => {
        window.print();
    };

    const handleGenerateSummary = async () => {
        setIsGenerating(true);
        setError('');
        setAiSummary('');
        try {
            const summary = await generateReportSummary(ai, reportData);
            setAiSummary(summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };

    const sortedDays = [...reportData.days].sort((a,b) => a.date.localeCompare(b.date));

    return (
        <div ref={ref} className="mt-8 bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Měsíční Výkaz Práce</h2>
                    <p className="text-lg text-slate-600 mt-1">{reportData.employeeName} - {reportData.month}</p>
                </div>
                <button
                    onClick={handlePrint}
                    className="print:hidden flex items-center gap-2 px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition"
                >
                    <PrintIcon />
                    Tisk
                </button>
            </div>
            
            <div className="mt-8 print:hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800">AI Shrnutí</h3>
                    <button
                        onClick={handleGenerateSummary}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:bg-indigo-300"
                    >
                        <SparklesIcon />
                        {isGenerating ? 'Generuji...' : 'Generovat shrnutí'}
                    </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 min-h-[8rem] prose prose-sm max-w-none text-slate-700">
                    {isGenerating && <div className="flex items-center gap-2"><LoadingSpinner /> <p>Analyzuji data...</p></div>}
                    {error && <p className="text-red-600"><strong>Chyba:</strong> {error}</p>}
                    {aiSummary ? <p style={{whiteSpace: 'pre-wrap'}}>{aiSummary}</p> : !isGenerating && <p className="text-slate-500">Kliknutím na tlačítko vygenerujete souhrn pomocí AI.</p>}
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Detailní záznamy</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Datum</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Čas</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Činnost</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doba trvání</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Poznámky</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                           {sortedDays.map(({ date, entries }) => {
                                if (entries.length === 0) {
                                    const d = new Date(date);
                                    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                                    return (
                                         <tr key={date}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{d.toLocaleDateString('cs-CZ')}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500" colSpan={4}>-</td>
                                        </tr>
                                    )
                                }
                                return entries.map((entry, index) => {
                                    const d = new Date(date);
                                    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                                    
                                    let typeText = '-';
                                    if (entry.type === 'work') {
                                        const project = reportData.projects.find(p => p.id === entry.projectId);
                                        typeText = project ? project.name : 'Bez projektu';
                                    } else if (entry.type === 'absence') {
                                        const absence = reportData.absences.find(a => a.id === entry.absenceId);
                                        typeText = absence ? absence.name : 'Absence';
                                    } else {
                                        typeText = "Pauza";
                                    }

                                    const duration = calculateDuration(entry.startTime, entry.endTime);

                                    return (
                                        <tr key={entry.id} className={entry.type === 'absence' ? 'bg-yellow-50' : (entry.type === 'break' ? 'bg-slate-50' : '')}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {index === 0 ? d.toLocaleDateString('cs-CZ') : ''}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{entry.startTime} - {entry.endTime}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{typeText}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{duration > 0 ? `${duration.toFixed(2)}h` : '-'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={entry.notes}>{entry.notes || '-'}</td>
                                        </tr>
                                    );
                                })
                           })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

Report.displayName = 'Report';

const PrintIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7V9h6v3z" clipRule="evenodd" />
    </svg>
);

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);