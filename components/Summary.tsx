import React, { useMemo } from 'react';
import { DayData, Absence, Project } from '@/types';
import { calculateDuration } from '@/utils/timeUtils';

interface SummaryProps {
    workData: Record<string, DayData>;
    currentDate: Date;
    projects: Project[];
    absences: Absence[];
    holidays: Set<string>;
    publicHolidayAbsenceId: string | null;
}

interface ProjectSummary {
    name: string;
    color: string;
    hours: number;
    overtime: number;
}

interface AbsenceSummary {
    name: string;
    hours: number;
}

interface TimesheetStatusProps {
    workTimeFund: number;
    totalHours: number;
    totalOvertime: number;
    totalAbsenceHours: number;
}

const TimesheetStatus: React.FC<TimesheetStatusProps> = ({ workTimeFund, totalHours, totalOvertime, totalAbsenceHours }) => {
    if (workTimeFund === 0) {
        return (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-500">Stav výkazu</p>
                <p className="text-lg font-semibold text-slate-700 mt-1">V tomto měsíci není žádný fond pracovní doby.</p>
            </div>
        );
    }
    const totalWorkedHours = totalHours + totalOvertime;
    const totalReportedHours = totalWorkedHours + totalAbsenceHours;
    const difference = totalReportedHours - workTimeFund;
    
    const workPercent = workTimeFund > 0 ? (totalWorkedHours / workTimeFund) * 100 : 0;
    const absencePercent = workTimeFund > 0 ? (totalAbsenceHours / workTimeFund) * 100 : 0;

    let statusText = '';
    let statusColor = '';
    let StatusIcon: React.FC = () => null;

    if (difference === 0) {
        statusText = 'Výkaz souhlasí';
        statusColor = 'text-green-600';
        StatusIcon = () => (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
        );
    } else if (difference < 0) {
        statusText = `Chybí vykázat ${Math.abs(difference)}h`;
        statusColor = 'text-red-600';
        StatusIcon = () => (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
           </svg>
        );
    } else {
        statusText = `Přesah o ${difference}h`;
        statusColor = 'text-orange-600';
        StatusIcon = () => (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
           </svg>
        );
    }

    const totalPercent = workPercent + absencePercent;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 md:col-span-2 lg:col-span-2">
            <div className="flex justify-between items-start">
                <div>
                     <div className={`flex items-center gap-2 ${statusColor}`}>
                        <StatusIcon />
                        <h3 className="text-xl font-bold">{statusText}</h3>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-slate-600 font-medium">
                        <span>Fond: <span className="font-bold text-slate-800">{workTimeFund}h</span></span>
                        <span>Vykázáno: <span className="font-bold text-slate-800">{totalReportedHours.toFixed(2)}h</span></span>
                    </div>
                </div>
            </div>
           
            <div className="mt-4 w-full bg-slate-200 rounded-full h-6 relative" title={`Odpracováno: ${totalWorkedHours.toFixed(2)}h, Absence: ${totalAbsenceHours.toFixed(2)}h`}>
                <div className="h-full flex">
                    <div style={{ width: `${workPercent}%` }} className="bg-green-500 h-full transition-all duration-300 rounded-l-full"></div>
                    <div style={{ width: `${absencePercent}%` }} className="bg-yellow-400 h-full transition-all duration-300"></div>
                     {totalPercent > 100 && (
                         <div style={{ width: `${Math.min(totalPercent - 100, 100)}%` }} className="bg-orange-500 h-full transition-all duration-300 rounded-r-full"></div>
                    )}
                </div>
                {difference < 0 && (
                    <div style={{ width: `${100 - totalPercent}%`, left: `${totalPercent}%`, background: 'repeating-linear-gradient(-45deg, #e2e8f0, #e2e8f0 5px, #fecaca 5px, #fecaca 10px)' }} className="absolute top-0 h-full transition-all duration-300 rounded-r-full"></div>
                )}
            </div>
            <div className="flex justify-between text-xs mt-1 text-slate-500 font-semibold">
                <span>0h</span>
                <span>{workTimeFund}h</span>
            </div>
        </div>
    );
};

export const Summary: React.FC<SummaryProps> = ({ workData, currentDate, projects, absences, holidays, publicHolidayAbsenceId }) => {
    const summaryData = useMemo(() => {
        const monthDates = Object.keys(workData).filter(
            (date) => {
                const dayDate = new Date(date);
                return dayDate.getUTCMonth() === currentDate.getMonth() && dayDate.getUTCFullYear() === currentDate.getFullYear();
            }
        );

        let totalHours = 0;
        let totalOvertime = 0;
        let totalHolidayWorkHours = 0;
        const projectHoursBreakdown: Record<string, { hours: number; overtime: number }> = {};
        const absenceHoursBreakdown: Record<string, { name: string; hours: number }> = {};
        let totalAbsenceHours = 0;

        monthDates.forEach((date) => {
            const dayEntries = workData[date] || [];
            const isHoliday = holidays.has(date);
            
            let dailyWorkHours = 0;
            dayEntries.forEach(entry => {
                if(entry.type === 'work') {
                    dailyWorkHours += calculateDuration(entry.startTime, entry.endTime);
                }
            });

            const dailyOvertime = Math.max(0, dailyWorkHours - 8);
            const dailyRegularHours = dailyWorkHours - dailyOvertime;
            
            if (isHoliday) {
                totalHolidayWorkHours += dailyWorkHours;
            } else {
                totalHours += dailyRegularHours;
                totalOvertime += dailyOvertime;
            }

            dayEntries.forEach((entry) => {
                const duration = calculateDuration(entry.startTime, entry.endTime);
                if (entry.type === 'work') {
                     const projectKey = entry.projectId || 'other';
                    if (!projectHoursBreakdown[projectKey]) {
                        projectHoursBreakdown[projectKey] = { hours: 0, overtime: 0 };
                    }
                    // Simple split of hours for breakdown - could be improved to be more precise
                    const entryOvertime = Math.min(duration, Math.max(0, (totalOvertime - (Object.values(projectHoursBreakdown).reduce((s, p) => s + p.overtime, 0)))));
                    const entryRegular = duration - entryOvertime;

                    projectHoursBreakdown[projectKey].hours += entryRegular;
                    projectHoursBreakdown[projectKey].overtime += entryOvertime;

                } else if (entry.type === 'absence') {
                    const absenceHours = duration;
                     if (entry.absenceId !== publicHolidayAbsenceId) {
                        const absence = absences.find(a => a.id === entry.absenceId);
                        if (absence) {
                            totalAbsenceHours += absenceHours;
                             if (!absenceHoursBreakdown[absence.id]) {
                                absenceHoursBreakdown[absence.id] = { name: absence.name, hours: 0 };
                            }
                            absenceHoursBreakdown[absence.id].hours += absenceHours;
                        }
                    } else { 
                        totalAbsenceHours += absenceHours;
                    }
                }
            });
        });

        const projectSummaryData: ProjectSummary[] = Object.entries(projectHoursBreakdown)
            .map(([projectId, data]) => {
                const project = projects.find(p => p.id === projectId);
                return { 
                    name: project?.name || 'Bez projektu',
                    color: project?.color || '#8884d8',
                    hours: data.hours,
                    overtime: data.overtime,
                };
            })
            .sort((a, b) => (b.hours + b.overtime) - (a.hours + a.overtime));

        const absenceSummaryData: AbsenceSummary[] = Object.values(absenceHoursBreakdown).sort((a,b) => b.hours - a.hours);

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonthCount = new Date(year, month + 1, 0).getDate();
        let workDaysCount = 0;
        for (let i = 1; i <= daysInMonthCount; i++) {
            const date = new Date(Date.UTC(year, month, i));
            const dayOfWeek = date.getUTCDay();
            const dateString = date.toISOString().split('T')[0];
            
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateString)) {
                workDaysCount++;
            }
        }
        const workTimeFund = workDaysCount * 8;

        return { totalHours, totalOvertime, totalHolidayWorkHours, projectSummaryData, totalAbsenceHours, absenceSummaryData, workTimeFund };
    }, [workData, currentDate, projects, absences, holidays, publicHolidayAbsenceId]);
    
    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Měsíční přehled</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                <TimesheetStatus
                    workTimeFund={summaryData.workTimeFund}
                    totalHours={summaryData.totalHours}
                    totalOvertime={summaryData.totalOvertime}
                    totalAbsenceHours={summaryData.totalAbsenceHours}
                />
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-base font-medium text-slate-500">Přesčasy</p>
                    <p className="text-4xl font-bold text-orange-600">{summaryData.totalOvertime.toFixed(2)}h</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-base font-medium text-slate-500">Práce ve svátek</p>
                    <p className="text-4xl font-bold text-amber-600">{summaryData.totalHolidayWorkHours.toFixed(2)}h</p>
                </div>
            </div>
            
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {summaryData.projectSummaryData.length > 0 &&
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Přehled projektů</h3>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Projekt / Činnost</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Prac. doba</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Přesčas</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {summaryData.projectSummaryData.map((projectData) => (
                                        <tr key={projectData.name}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: projectData.color }}></div>
                                                    <span>{projectData.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{projectData.hours > 0 ? `${projectData.hours.toFixed(2)}h` : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-semibold text-right">{projectData.overtime > 0 ? `${projectData.overtime.toFixed(2)}h` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                }

                {summaryData.absenceSummaryData.length > 0 &&
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Přehled absencí</h3>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Typ absence</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Celkem hodin</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {summaryData.absenceSummaryData.map((absenceData) => (
                                        <tr key={absenceData.name}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{absenceData.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{absenceData.hours > 0 ? `${absenceData.hours.toFixed(2)}h` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                }
            </div>
        </div>
    );
};