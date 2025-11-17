import React, { useState, useMemo, useCallback } from 'react';
import { WorkDay, Project, Absence, TimeEntry } from '../types';
import { DayEditorModal } from './DayEditorModal';
import { CopyDayModal } from './CopyDayModal';

// --- Helper Functions for Data Migration & Normalization ---

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    if (isNaN(minutes) || minutes < 0) return "00:00";
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = Math.round(minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

// Ensures day data conforms to the new structure for backward compatibility
const normalizeWorkDay = (dayData: any, dateString: string): WorkDay => {
    const defaultDay: WorkDay = {
        date: dateString,
        entries: [],
        hours: 0,
        overtime: 0,
        absenceId: null,
        absenceHours: 0,
    };

    if (!dayData) {
        return defaultDay;
    }
    
    const normalized = { ...defaultDay, ...dayData };

    // Migrate from 'absenceAmount' (0, 0.5, 1) to 'absenceHours'
    if (dayData.hasOwnProperty('absenceAmount')) {
        normalized.absenceHours = (dayData.absenceAmount || 0) * 8;
        delete (normalized as any).absenceAmount;
    }
    
    // If we have hours from an old data structure but no new 'entries',
    // create a default entry to represent that work. This is the core of the backward compatibility fix.
    if ((!Array.isArray(normalized.entries) || normalized.entries.length === 0) && (dayData.hours > 0 || dayData.overtime > 0)) {
        normalized.entries = []; // Ensure it's an array
        
        const totalHours = (dayData.hours || 0) + (dayData.overtime || 0);
        const startTime = "08:00";
        const breakMinutes = totalHours > 4.5 ? 30 : 0;
        const totalWorkMinutes = totalHours * 60 + breakMinutes;
        const endTimeMinutes = timeToMinutes(startTime) + totalWorkMinutes;
        const endTime = minutesToTime(endTimeMinutes);
        
        const migratedEntry: TimeEntry = {
            id: `migrated-${dateString}`,
            projectId: dayData.projectId || null,
            startTime: startTime,
            endTime: endTime,
            notes: dayData.notes || '',
        };
        normalized.entries.push(migratedEntry);
    } else if (!Array.isArray(normalized.entries)) {
        normalized.entries = [];
    }

    // Clean up old top-level properties that are now in entries
    delete (normalized as any).projectId;
    delete (normalized as any).notes;

    return normalized;
};


interface DayRowProps {
    day: Date;
    dayData: WorkDay;
    projects: Project[];
    absences: Absence[];
    isHoliday: boolean;
    onClick: () => void;
    onCopy: () => void;
}

const DayRow: React.FC<DayRowProps> = ({ day, dayData, projects, absences, isHoliday, onClick, onCopy }) => {
    const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const formattedDate = day.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
    
    const absence = dayData.absenceId ? absences.find(a => a.id === dayData.absenceId) : null;
    const hasWorkEntries = dayData.entries && dayData.entries.length > 0;
    
    const rowClasses = [
        'grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 items-center p-2 rounded-lg cursor-pointer',
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

    const handleCopyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCopy();
    };

    return (
        <div className={rowClasses.join(' ')} onClick={onClick}>
            <div className="font-semibold text-slate-800">{formattedDate}</div>
            <div className="text-sm text-slate-500 font-mono text-center">{timeRange}</div>
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
            <div className="text-sm text-slate-600 font-semibold text-right">{dayData.hours > 0 ? `${dayData.hours.toFixed(2)}h` : '-'}</div>
            <div className="text-sm text-orange-600 font-bold text-right">{dayData.overtime > 0 ? `${dayData.overtime.toFixed(2)}h` : '-'}</div>
            <div className="flex justify-center items-center">
                 <button
                    type="button"
                    onClick={handleCopyClick}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                    aria-label="Kopírovat den"
                    title="Kopírovat den"
                >
                    <CopyIcon />
                </button>
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
                // Perform a deep copy of the source data to prevent any reference issues,
                // which can cause problems in production builds.
                const newDayData = JSON.parse(JSON.stringify(sourceData));
                
                // Assign the new date for the copied day.
                newDayData.date = date;

                // Generate new, unique IDs for each time entry within the copied day.
                if (newDayData.entries && Array.isArray(newDayData.entries)) {
                    newDayData.entries = newDayData.entries.map((entry: TimeEntry) => ({
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
                <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 font-semibold text-slate-600 text-sm px-2 pb-3 border-b border-slate-200 mb-2">
                    <div>Datum</div>
                    <div className="text-center">Čas od-do</div>
                    <div>Absence</div>
                    <div>Projekty</div>
                    <div className="text-right">Hodiny</div>
                    <div className="text-right">Přesčas</div>
                    <div className="text-center">Akce</div>
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
                                onCopy={() => setCopyingDayData(dataForDay)}
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
                    onSaveAndCopy={handleSaveAndCopy} // Keep for now, will be removed from modal
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

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);