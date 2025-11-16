import React from 'react';
import { ReportData, WorkDay } from '../types';

interface ReportProps {
    reportData: ReportData;
}

export const Report = React.forwardRef<HTMLDivElement, ReportProps>(({ reportData }, ref) => {
    const handlePrint = () => {
        window.print();
    };

    const sortedDays = [...reportData.days].sort((a, b) => a.date.localeCompare(b.date));

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
            
            <div className="mt-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Detailní záznamy</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 border border-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Datum</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Začátek</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Konec</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Odprac.</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Přesčas</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Projekt / Činnost</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Absence</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Poznámky</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {sortedDays.map((day: WorkDay) => {
                                const project = day.projectId ? reportData.projects.find(p => p.id === day.projectId) : null;
                                const absence = day.absenceId ? reportData.absences.find(a => a.id === day.absenceId) : null;
                                const [year, month, dayNum] = day.date.split('-').map(Number);
                                const date = new Date(Date.UTC(year, month - 1, dayNum));
                                return (
                                    <tr key={day.date} className={day.absenceId ? 'bg-yellow-50/50' : ''}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {date.toLocaleDateString('cs-CZ', { timeZone: 'UTC' })}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{day.startTime || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{day.endTime || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{day.hours > 0 ? `${day.hours.toFixed(2)}h` : '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 font-semibold">{day.overtime > 0 ? `${day.overtime.toFixed(2)}h` : '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{project?.name || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {absence ? `${absence.name} ${day.absenceAmount === 0.5 ? '(1/2)' : ''}` : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate">{day.notes || '-'}</td>
                                    </tr>
                                )
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