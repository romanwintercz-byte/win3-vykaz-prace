import React, { useMemo } from 'react';
import { WorkDay, Project, Absence } from '../types';

interface SummaryProps {
  workData: Record<string, WorkDay>;
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


export const Summary: React.FC<SummaryProps> = ({ workData, currentDate, projects, absences, holidays, publicHolidayAbsenceId }) => {
  const summaryData = useMemo(() => {
    const monthData = Object.values(workData).filter(
      (d: WorkDay) => {
        const dayDate = new Date(d.date);
        return dayDate.getUTCMonth() === currentDate.getMonth() && dayDate.getUTCFullYear() === currentDate.getFullYear();
      }
    );

    let totalHours = 0;
    let totalOvertime = 0;
    const projectHoursBreakdown: Record<string, { hours: number; overtime: number }> = {};
    const absenceHoursBreakdown: Record<string, { name: string; hours: number }> = {};
    let totalAbsenceHours = 0;
    
    monthData.forEach((day: WorkDay) => {
      totalHours += day.hours;
      totalOvertime += day.overtime;

      // Check for absence, but exclude public holidays from the count
      if (day.absenceId && day.absenceAmount > 0 && day.absenceId !== publicHolidayAbsenceId) {
          const absence = absences.find(a => a.id === day.absenceId);
          if (absence) {
            const absenceHours = day.absenceAmount * 8;
            totalAbsenceHours += absenceHours;
            if (!absenceHoursBreakdown[absence.id]) {
                absenceHoursBreakdown[absence.id] = { name: absence.name, hours: 0 };
            }
            absenceHoursBreakdown[absence.id].hours += absenceHours;
          }
      }
      
      if (day.hours > 0 || day.overtime > 0) {
           const projectKey = day.projectId || 'other';
           if (!projectHoursBreakdown[projectKey]) {
                projectHoursBreakdown[projectKey] = { hours: 0, overtime: 0 };
           }
           projectHoursBreakdown[projectKey].hours += day.hours;
           projectHoursBreakdown[projectKey].overtime += day.overtime;
      }
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
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
        const dateString = date.toISOString().split('T')[0];
        
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateString)) {
            workDaysCount++;
        }
    }
    const workTimeFund = workDaysCount * 8;

    return { totalHours, totalOvertime, projectSummaryData, totalAbsenceHours, absenceSummaryData, workTimeFund };
  }, [workData, currentDate, projects, absences, holidays, publicHolidayAbsenceId]);


  return (
    <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Měsíční přehled</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Fond prac. doby" value={`${summaryData.workTimeFund}h`} />
        <SummaryCard title="Odpracováno hodin" value={`${summaryData.totalHours}h`} />
        <SummaryCard title="Přesčasy" value={`${summaryData.totalOvertime}h`} color="text-orange-600" />
        <SummaryCard title="Absence celkem" value={`${summaryData.totalAbsenceHours}h`} color="text-yellow-600"/>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {summaryData.projectSummaryData.length > 0 &&
            <div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Přehled projektů</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{projectData.hours > 0 ? `${projectData.hours}h` : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-semibold text-right">{projectData.overtime > 0 ? `${projectData.overtime}h` : '-'}</td>
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
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{absenceData.hours > 0 ? `${absenceData.hours}h` : '-'}</td>
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


interface SummaryCardProps {
    title: string;
    value: string;
    color?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, color = 'text-blue-600' }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
);