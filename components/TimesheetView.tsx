import React, { useState, useMemo, useCallback } from 'react';
import { WorkDay, Project, Absence, ProjectEntry } from '../types';
import { DayEditorModal } from './DayEditorModal';
import { CopyDayModal } from './CopyDayModal';

// --- Helper Functions for Data Migration & Normalization ---

// Ensures day data conforms to the new structure for backward compatibility. This is the critical fix.
const normalizeWorkDay = (dayData: any, dateString: string): WorkDay => {
    const defaultDay: WorkDay = {
        date: dateString,
        projectEntries: [],
        absenceId: null,
        absenceHours: 0,
    };

    if (!dayData) {
        return defaultDay;
    }
    
    // If it's already in the new format, just ensure sub-properties are correct and return
    if (Array.isArray(dayData.projectEntries)) {
        return {
            ...defaultDay,
            ...dayData,
            projectEntries: dayData.projectEntries.map((entry: any) => ({
                id: entry.id || `entry-${Math.random()}`,
                projectId: entry.projectId || null,
                hours: Number(entry.hours) || 0,
                overtime: Number(entry.overtime) || 0,
                notes: entry.notes || '',
            })),
            absenceHours: Number(dayData.absenceHours) || 0,
        };
    }

    // --- MIGRATION LOGIC from old formats ---
    const migrated: WorkDay = { ...defaultDay };

    // Migrate absence from old `absenceAmount`
    if (dayData.hasOwnProperty('absenceAmount')) {
        migrated.absenceHours = (Number(dayData.absenceAmount) || 0) * 8;
    } else {
        migrated.absenceHours = Number(dayData.absenceHours) || 0;
    }
    migrated.absenceId = dayData.absenceId || null;

    // Migrate old top-level hour/project entries
    if (dayData.hours > 0 || dayData.overtime > 0 || dayData.projectId) {
         migrated.projectEntries.push({
            id: `migrated-${dateString}`,
            projectId: dayData.projectId || null,
            hours: Number(dayData.hours) || 0,
            overtime: Number(dayData.overtime) || 0,
            notes: dayData.notes || '',
        });
    }

    return migrated;
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
    const hasWorkEntries = dayData.projectEntries && dayData.projectEntries.length > 0;
    
    const totals = useMemo(() => {
        return dayData.projectEntries.reduce((acc, entry) => {
            acc.hours += Number(entry.hours) || 0;
            acc.overtime += Number(entry.overtime) || 0;
            return acc;
        }, { hours: 0, overtime: 0 });
    }, [dayData.projectEntries]);

    const rowClasses = [
        'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 items-center p-2 rounded-lg cursor-pointer',
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
    
    const projectList = useMemo(() => {
        if (!hasWorkEntries) return null;
        const projectIds = new Set(dayData.projectEntries.map(e => e.projectId).filter(Boolean));
        return Array.from(projectIds).map(id => projects.find(p => p.id === id));
    }, [dayData.projectEntries, projects, hasWorkEntries]);

    return (
        <div className={rowClasses.join(' ')} onClick={onClick}>
            <div className="font-semibold text-slate-800">{formattedDate}</div>
            
            <div className={`text-sm truncate ${dayData.absenceId ? 'font-semibold text-yellow-800' : 'text-slate-500'}`}>
                {absence ? `${absence.name} ${dayData.absenceHours > 0 ? `(${dayData.absenceHours}h)`: ''}` : '-'}
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2 truncate">
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
            <div className="text-sm text-slate-600 font-semibold text-right">{totals.hours > 0 ? `${totals.hours.toFixed(2)}h` : '-'}</div>
            <div className="text-sm text-orange-600 font-bold text-right">{totals.overtime > 0 ? `${totals.overtime.toFixed(2)}h` : '-'}</div>
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
        try {
            const daysToUpdate = targetDates.map(date => {
                const newDayData = JSON.parse(JSON.stringify(sourceData));
                newDayData.date = date;

                if (newDayData.projectEntries && Array.isArray(newDayData.projectEntries)) {
                    newDayData.projectEntries = newDayData.projectEntries.map((entry: ProjectEntry) => ({
                        ...entry,
                        id: `entry-${date}-${Math.random().toString(36).substring(2, 9)}`
                    }));
                }
                
                return newDayData;
            });

            onUpdateMultipleDays(daysToUpdate);
            setCopyingDayData(null);
        } catch (error) {
            console.error("An error occurred during the copy operation:", error);
            alert("Při kopírování dat došlo k chybě. Zkuste to prosím znovu.");
            setCopyingDayData(null);
        }
    }, [onUpdateMultipleDays]);


    return (
        <>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 font-semibold text-slate-600 text-sm px-2 pb-3 border-b border-slate-200 mb-2">
                    <div>Datum</div>
                    <div>Absence</div>
                    <div>Projekty</div>
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