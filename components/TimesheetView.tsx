import React, { useState, useMemo, useCallback } from 'react';
import { WorkDay, Project, Absence } from '../types';
import { DayEditorModal } from './DayEditorModal';
import { CopyDayModal } from './CopyDayModal';

// --- Helper Functions for Data Migration & Normalization ---

// Ensures day data conforms to the final simple structure for backward compatibility. This is the critical fix.
const normalizeWorkDay = (dayData: any, dateString: string): WorkDay => {
    const defaultDay: WorkDay = {
        date: dateString,
        hours: 0,
        overtime: 0,
        projectId: null,
        notes: '',
        absenceId: null,
        absenceHours: 0,
    };

    if (!dayData) {
        return defaultDay;
    }
    
    const normalized: WorkDay = { ...defaultDay, date: dateString };

    // --- MIGRATION LOGIC from all previous formats ---

    // 1. Migrate from the multi-project entry structure
    if (Array.isArray(dayData.projectEntries)) {
        const firstEntryWithProject = dayData.projectEntries.find((e: any) => e.projectId);
        normalized.projectId = firstEntryWithProject?.projectId || null;
        
        normalized.notes = dayData.projectEntries.map((e: any) => e.notes || '').filter(Boolean).join('; ');

        const totals = dayData.projectEntries.reduce((acc: {h: number, o: number}, entry: any) => {
            acc.h += Number(entry.hours) || 0;
            acc.o += Number(entry.overtime) || 0;
            return acc;
        }, {h: 0, o: 0});
        normalized.hours = totals.h;
        normalized.overtime = totals.o;
    } else {
    // 2. Migrate from the simple key-value structure
        normalized.hours = Number(dayData.hours) || 0;
        normalized.overtime = Number(dayData.overtime) || 0;
        normalized.projectId = dayData.projectId || null;
        normalized.notes = dayData.notes || '';
    }

    // 3. Migrate absence (handles both `absenceAmount` and `absenceHours`)
    normalized.absenceId = dayData.absenceId || null;
    if (dayData.hasOwnProperty('absenceAmount')) {
        normalized.absenceHours = (Number(dayData.absenceAmount) || 0) * 8;
    } else {
        normalized.absenceHours = Number(dayData.absenceHours) || 0;
    }

    return normalized;
};


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
    const project = dayData.projectId ? projects.find(p => p.id === dayData.projectId) : null;
    const hasWork = dayData.hours > 0 || dayData.overtime > 0;

    const rowClasses = [
        'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 items-center p-2 rounded-lg cursor-pointer',
        'border border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all'
    ];

    if (dayData.absenceId) {
        rowClasses.push('bg-yellow-50/80');
    } else if (isHoliday && !hasWork) {
        rowClasses.push('bg-amber-50/70');
    } else if (isWeekend && !hasWork) {
        rowClasses.push('bg-slate-50');
    } else {
        rowClasses.push('bg-white');
    }

    return (
        <div className={rowClasses.join(' ')} onClick={onClick}>
            <div className="font-semibold text-slate-800">{formattedDate}</div>
            
            <div className={`text-sm truncate ${dayData.absenceId ? 'font-semibold text-yellow-800' : 'text-slate-500'}`}>
                {absence ? `${absence.name} ${dayData.absenceHours > 0 ? `(${dayData.absenceHours}h)`: ''}` : '-'}
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2 truncate">
                {project && (
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }}></div>
                        <span className="text-xs truncate">{project.name}</span>
                    </div>
                )}
                {!project && !absence && '-'}
            </div>
            <div className="text-sm text-slate-600 font-semibold text-right">{dayData.hours > 0 ? `${dayData.hours.toFixed(2)}h` : '-'}</div>
            <div className="text-sm text-orange-600 font-bold text-right">{dayData.overtime > 0 ? `${dayData.overtime.toFixed(2)}h` : '-'}</div>
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
        const daysToUpdate = targetDates.map(date => ({ ...sourceData, date }));
        onUpdateMultipleDays(daysToUpdate);
        setCopyingDayData(null);
    }, [onUpdateMultipleDays]);


    return (
        <>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 font-semibold text-slate-600 text-sm px-2 pb-3 border-b border-slate-200 mb-2">
                    <div>Datum</div>
                    <div>Absence</div>
                    <div>Projekt</div>
                    <div className="text-right">Hodiny</div>
                    <div className="text-right">Přesčas</div>
                </div>
                <div className="space-y-1">
                    {daysInMonth.map(day => {
                        const dateString = toDateString(day);
                        const dataForDay = normalizeWorkDay(workData[dateString], dateString);
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