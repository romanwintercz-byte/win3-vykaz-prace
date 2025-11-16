import React, { useState, useMemo } from 'react';
import { DayData, Project, Absence } from '@/types';
import { DayDetailModal } from '@/components/DayDetailModal';
import { CopyDayModal } from '@/components/CopyDayModal';
import { timeToMinutes, calculateDuration } from '@/utils/timeUtils';

interface DayRowProps {
    day: Date;
    dayData: DayData;
    projects: Project[];
    absences: Absence[];
    isHoliday: boolean;
    onClick: () => void;
}

const DayRow: React.FC<DayRowProps> = ({ day, dayData, projects, absences, isHoliday, onClick }) => {
    const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const formattedDate = day.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

    const summary = useMemo(() => {
        if (!dayData || dayData.length === 0) {
            return { totalHours: 0, overtime: 0, content: '-', timeRange: '' };
        }
        
        const sortedEntries = [...dayData].sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        const startTime = sortedEntries[0]?.startTime;
        const endTime = sortedEntries[sortedEntries.length - 1]?.endTime;
        const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : '';

        const totalWorkHours = dayData.reduce((sum, entry) => {
            if (entry.type === 'work') {
                return sum + calculateDuration(entry.startTime, entry.endTime);
            }
            return sum;
        }, 0);
        
        const regularHours = Math.min(totalWorkHours, 8);
        const overtime = Math.max(0, totalWorkHours - 8);

        const contentParts = dayData.map(entry => {
            if (entry.type === 'work') {
                const project = projects.find(p => p.id === entry.projectId);
                return project ? project.name : 'Práce';
            } else if (entry.type === 'absence') {
                const absence = absences.find(a => a.id === entry.absenceId);
                return absence ? absence.name : 'Absence';
            }
            return entry.notes;
        }).filter(Boolean);
        
        const content = contentParts.join(', ') || '-';

        return { totalHours: regularHours, overtime, content, timeRange };
    }, [dayData, projects, absences]);

    const hasAbsence = dayData?.some(e => e.type === 'absence');

    const rowClasses = [
        'grid grid-cols-12 gap-x-4 items-center p-2 rounded-lg cursor-pointer',
        'border border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all'
    ];

    if (hasAbsence) {
        rowClasses.push('bg-yellow-50');
    } else if (isHoliday && dayData.length === 0) {
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
             <div className="col-span-2 text-sm text-slate-500 font-mono">
                {summary.timeRange}
            </div>
            <div className="col-span-6 text-sm text-slate-600 truncate" title={summary.content}>
                {summary.content}
            </div>
            <div className="col-span-1 text-sm text-slate-700 font-medium text-right">
                {summary.totalHours > 0 ? `${summary.totalHours.toFixed(2)}h` : '-'}
            </div>
             <div className="col-span-1 text-sm text-orange-600 font-bold text-right">
                {summary.overtime > 0 ? `${summary.overtime.toFixed(2)}h` : '-'}
            </div>
        </div>
    );
}

interface TimesheetViewProps {
    currentDate: Date;
    workData: Record<string, DayData>;
    projects: Project[];
    absences: Absence[];
    holidays: Set<string>;
    onSetDayData: (date: string, dayData: DayData) => void;
    onCopyDays: (targetDates: string[], sourceData: DayData) => void;
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({ currentDate, workData, projects, absences, holidays, onSetDayData, onCopyDays }) => {
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [copyingDay, setCopyingDay] = useState<{ date: string, data: DayData } | null>(null);

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

    const handleSave = (date: string, data: DayData) => {
        onSetDayData(date, data);
        setEditingDate(null);
    }
    
    const handleSaveAndCopy = (date: string, data: DayData) => {
        onSetDayData(date, data);
        setEditingDate(null);
        setCopyingDay({ date, data });
    };

    const handlePerformCopy = (targetDates: string[], sourceData: DayData) => {
        onCopyDays(targetDates, sourceData);
        setCopyingDay(null);
    };

    const editingDayData = editingDate ? workData[editingDate] || [] : [];

    return (
        <>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="hidden md:grid grid-cols-12 gap-x-4 font-semibold text-slate-600 text-sm px-2 pb-3 border-b border-slate-200 mb-2">
                    <div className="col-span-2">Datum</div>
                    <div className="col-span-2">Čas</div>
                    <div className="col-span-6">Záznamy</div>
                    <div className="col-span-1 text-right">Hodiny</div>
                    <div className="col-span-1 text-right">Přesčas</div>
                </div>
                <div className="space-y-1">
                     {daysInMonth.map(day => {
                        const dateString = toDateString(day);
                        const dataForDay = workData[dateString] || [];
                        return (
                            <DayRow 
                                key={dateString}
                                day={day} 
                                dayData={dataForDay} 
                                projects={projects}
                                absences={absences}
                                isHoliday={holidays.has(dateString)}
                                onClick={() => setEditingDate(dateString)} 
                            />
                        );
                    })}
                </div>
            </div>

            {editingDate && (
                <DayDetailModal
                    date={editingDate}
                    dayData={editingDayData}
                    projects={projects}
                    absences={absences}
                    onSave={handleSave}
                    onSaveAndCopy={handleSaveAndCopy}
                    onClose={() => setEditingDate(null)}
                />
            )}

            {copyingDay && (
                 <CopyDayModal
                    sourceData={copyingDay}
                    currentDate={currentDate}
                    holidays={holidays}
                    onCopy={handlePerformCopy}
                    onClose={() => setCopyingDay(null)}
                />
            )}
        </>
    );
};