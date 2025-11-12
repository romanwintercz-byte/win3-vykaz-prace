import React, { useState, useCallback, useMemo } from 'react';
import { WorkDay, Project, Absence } from '../types';
import { DayEditorModal } from './DayEditorModal';
import { CopyDayModal } from './CopyDayModal';

interface DayRowProps {
    day: Date;
    dayData: WorkDay;
    projects: Project[];
    absences: Absence[];
    isHoliday: boolean;
    onClick: () => void;
}

const DayRow: React.FC<DayRowProps> = ({ day, dayData, projects, absences, isHoliday, onClick }) => {
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const formattedDate = day.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric' });
    const project = dayData.projectId ? projects.find(p => p.id === dayData.projectId) : null;
    const absence = dayData.absenceId ? absences.find(a => a.id === dayData.absenceId) : null;
    const hasAbsence = !!dayData.absenceId;

    const rowClasses = [
        'grid grid-cols-12 gap-x-4 items-center p-2 rounded-lg cursor-pointer',
        'border border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all'
    ];
    
    if (hasAbsence) {
        rowClasses.push('bg-yellow-50');
    } else if (isHoliday) {
        rowClasses.push('bg-amber-50'); 
    } else if (isWeekend) {
        rowClasses.push('bg-slate-50');
    } else {
        rowClasses.push('bg-white');
    }


    return (
        <div 
            className={rowClasses.join(' ')}
            onClick={onClick}
        >
            <div className="col-span-2 font-semibold text-slate-800">
                {formattedDate}
            </div>
            <div className={`col-span-2 text-sm ${dayData.absenceId ? 'font-semibold text-yellow-800' : 'text-slate-500'}`}>
                {absence ? `${absence.name} ${dayData.absenceAmount < 1 ? `(${dayData.absenceAmount})` : ''}`.trim() : '-'}
            </div>
            <div className="col-span-3 text-sm text-slate-500 truncate">
                {project ? (
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }}></div>
                        <span>{project.name}</span>
                    </div>
                ) : '-'}
            </div>
            <div className="col-span-3 text-sm text-slate-500 truncate" title={dayData.notes}>
                {dayData.notes || '-'}
            </div>
            <div className="col-span-1 text-sm text-slate-600 font-medium text-right">
                {dayData.hours > 0 ? `${dayData.hours}h` : '-'}
            </div>
             <div className="col-span-1 text-sm text-orange-600 font-bold text-right">
                {dayData.overtime > 0 ? `${dayData.overtime}h` : '-'}
            </div>
        </div>
    );
}


interface TimesheetViewProps {
  currentDate: Date;
  workData: Record<string, WorkDay>;
  projects: Project[];
  absences: Absence[];
  holidays: Set<string>;
  onUpdateDay: (data: WorkDay) => void;
  onUpdateMultipleDays: (data: WorkDay[]) => void;
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({ currentDate, workData, projects, absences, holidays, onUpdateDay, onUpdateMultipleDays }) => {
    const [editingDay, setEditingDay] = useState<WorkDay | null>(null);
    const [copyingDayData, setCopyingDayData] = useState<WorkDay | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth: Date[] = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
        daysInMonth.push(new Date(year, month, day));
    }
    
    const toDateString = useCallback((day: Date) => {
        // Use UTC methods to create a string that matches the holiday service, avoiding timezone shifts.
        const y = day.getFullYear();
        const m = (day.getMonth() + 1).toString().padStart(2, '0');
        const d = day.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    const handleSave = (data: WorkDay) => {
        onUpdateDay(data);
        setEditingDay(null);
    }
    
    const handleSaveAndCopy = (data: WorkDay) => {
        onUpdateDay(data);
        setEditingDay(null);
        setCopyingDayData(data);
    };

    const handlePerformCopy = (targetDates: string[], sourceData: WorkDay) => {
        const daysToUpdate = targetDates.map(date => ({ ...sourceData, date }));
        onUpdateMultipleDays(daysToUpdate);
        setCopyingDayData(null);
    };

    return (
        <>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="hidden md:grid grid-cols-12 gap-x-4 font-semibold text-slate-600 text-sm px-2 pb-3 border-b border-slate-200 mb-2">
                    <div className="col-span-2">Datum</div>
                    <div className="col-span-2">Absence</div>
                    <div className="col-span-3">Projekt</div>
                    <div className="col-span-3">Poznámky</div>
                    <div className="col-span-1 text-right">Hodiny</div>
                    <div className="col-span-1 text-right">Přesčas</div>
                </div>
                <div className="space-y-1">
                     {daysInMonth.map(day => {
                        const dateString = toDateString(day);

                        const dataForDay = workData[dateString] || {
                            date: dateString,
                            hours: 0,
                            overtime: 0,
                            projectId: null,
                            absenceId: null,
                            absenceAmount: 0,
                            notes: ''
                        };
                        return (
                            <DayRow 
                                key={dateString}
                                day={day} 
                                dayData={dataForDay} 
                                projects={projects}
                                absences={absences}
                                isHoliday={holidays.has(dateString)}
                                onClick={() => setEditingDay(dataForDay)} 
                            />
                        );
                    })}
                </div>
            </div>

            {editingDay && (
                <DayEditorModal 
                    dayData={editingDay}
                    projects={projects}
                    absences={absences}
                    onSave={handleSave}
                    onSaveAndCopy={handleSaveAndCopy}
                    onClose={() => setEditingDay(null)}
                />
            )}

            {copyingDayData && (
                 <CopyDayModal
                    sourceData={copyingDayData}
                    currentDate={currentDate}
                    onCopy={handlePerformCopy}
                    onClose={() => setCopyingDayData(null)}
                />
            )}
        </>
    );
};