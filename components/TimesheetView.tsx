import React, { useState, useMemo, useCallback } from 'react';
import { WorkDay, Project, Absence, TimeEntry } from '../types';
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
    const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const formattedDate = day.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
    
    const absence = dayData.absenceId ? absences.find(a => a.id === dayData.absenceId) : null;
    const hasWorkEntries = dayData.entries.length > 0;
    
    const rowClasses = [
        'grid grid-cols-12 gap-x-4 items-center p-2 rounded-lg cursor-pointer',
        'border border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all'
    ];

    if (dayData.absenceId) {
        rowClasses.push('bg-yellow-50/80');
    } else if (isHoliday && !hasWorkEntries) {
        rowClasses.push('bg-amber-50/70');
    } else if (isWeekend && !hasWorkEntries) {
        rowClasses.push('bg-slate-50');
    } else {
        rowClasses.push('bg-white');
    }
    
    const timeRange = hasWorkEntries ? `${dayData.entries[0].startTime} - ${dayData.entries[dayData.entries.length - 1].endTime}` : '-';
    
    const projectList = useMemo(() => {
        if (!hasWorkEntries) return null;
        const projectIds = new Set(dayData.entries.map(e => e.projectId).filter(Boolean));
        return Array.from(projectIds).map(id => projects.find(p => p.id === id));
    }, [dayData.entries, projects, hasWorkEntries]);

    return (
        <div className={rowClasses.join(' ')} onClick={onClick}>
            <div className="col-span-2 font-semibold text-slate-800">{formattedDate}</div>
            <div className="col-span-2 text-sm text-slate-500 font-mono text-center">{timeRange}</div>
            <div className={`col-span-2 text-sm truncate ${dayData.absenceId ? 'font-semibold text-yellow-800' : 'text-slate-500'}`}>
                {absence ? `${absence.name} ${dayData.absenceHours > 0 ? `(${dayData.absenceHours}h)`: ''}` : '-'}
            </div>
            <div className="col-span-4 text-sm text-slate-500 flex items-center gap-2 truncate">
                {projectList && projectList.length > 0 ? (
                     <div className="flex items-center gap-1.5 overflow-hidden">
                        {projectList.map(p => p && (
                            <div key={p.id} className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }}></div>
                                <span className="text-xs truncate">{p.name}</span>
                            </div>
                        ))}
                    </div>
                ) : absence ? null : '-'}
            </div>
            <div className="col-span-1 text-sm text-slate-600 font-semibold text-right">{dayData.hours > 0 ? `${dayData.hours.toFixed(2)}h` : '-'}</div>
            <div className="col-span-1 text-sm text-orange-600 font-bold text-right">{dayData.overtime > 0 ? `${dayData.overtime.toFixed(2)}h` : '-'}</div>
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

    const daysInMonth: Date[] = useMemo(() => {
        const dateList: Date[] = [];
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        for (let day = 1; day <= lastDay; day++) {
            dateList.push(new Date(Date.UTC(year, month, day)));
        }
        return dateList;
    }, [year, month]);

    const toDateString = (day: Date): string => {
        return day.toISOString().split('T')[0];
    };

    const handleSave = useCallback((data: WorkDay) => {
        onUpdateDay(data);
        setEditingDay(null);
    }, [onUpdateDay]);

    const handleSaveAndCopy = useCallback((data: WorkDay) => {
        onUpdateDay(data);
        setEditingDay(null);
        setCopyingDayData(data);
    }, [onUpdateDay]);

    const handlePerformCopy = useCallback((targetDates: string[], sourceData: WorkDay) => {
        const daysToUpdate = targetDates.map(date => {
            const newEntries = (sourceData.entries || []).map(entry => ({
                ...entry,
                id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
            }));
            return { 
                ...sourceData, 
                date,
                entries: newEntries
            };
        });
        onUpdateMultipleDays(daysToUpdate);
        setCopyingDayData(null);
    }, [onUpdateMultipleDays]);

    return (
        <>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="hidden md:grid grid-cols-12 gap-x-4 font-semibold text-slate-600 text-sm px-2 pb-3 border-b border-slate-200 mb-2">
                    <div className="col-span-2">Datum</div>
                    <div className="col-span-2 text-center">Čas od-do</div>
                    <div className="col-span-2">Absence</div>
                    <div className="col-span-4">Projekty</div>
                    <div className="col-span-1 text-right">Hodiny</div>
                    <div className="col-span-1 text-right">Přesčas</div>
                </div>
                <div className="space-y-1">
                    {daysInMonth.map(day => {
                        const dateString = toDateString(day);
                        const dataForDay = workData[dateString] || {
                            date: dateString,
                            entries: [],
                            hours: 0,
                            overtime: 0,
                            absenceId: null,
                            absenceHours: 0,
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
                    holidays={holidays}
                    onCopy={handlePerformCopy}
                    onClose={() => setCopyingDayData(null)}
                />
            )}
        </>
    );
};
