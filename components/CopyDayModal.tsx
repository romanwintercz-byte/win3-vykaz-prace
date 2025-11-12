import React, { useState, useMemo, useCallback } from 'react';
import { WorkDay } from '../types';

interface CopyDayModalProps {
  sourceData: WorkDay;
  currentDate: Date;
  onCopy: (targetDates: string[], sourceData: WorkDay) => void;
  onClose: () => void;
}

// Helper to get date string in YYYY-MM-DD format
const toDateString = (day: Date): string => {
    const y = day.getFullYear();
    const m = (day.getMonth() + 1).toString().padStart(2, '0');
    const d = day.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const CopyDayModal: React.FC<CopyDayModalProps> = ({ sourceData, currentDate, onCopy, onClose }) => {
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

    const { daysInMonth, year, month } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateList: Date[] = [];
        const lastDay = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= lastDay; day++) {
            dateList.push(new Date(year, month, day));
        }
        return { daysInMonth: dateList, year, month };
    }, [currentDate]);

    const handleToggleDay = useCallback((dateString: string) => {
        if (dateString === sourceData.date) return; // Cannot select source day
        setSelectedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateString)) {
                newSet.delete(dateString);
            } else {
                newSet.add(dateString);
            }
            return newSet;
        });
    }, [sourceData.date]);

    const handleSelectWorkdays = () => {
        const workdays = new Set<string>();
        daysInMonth.forEach(day => {
            const dayOfWeek = day.getDay();
            const dateString = toDateString(day);
            // In JS, Sunday is 0 and Saturday is 6.
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && dateString !== sourceData.date) {
                workdays.add(dateString);
            }
        });
        setSelectedDays(workdays);
    };

    const handleDeselectAll = () => {
        setSelectedDays(new Set());
    };

    const handleSubmit = () => {
        if (selectedDays.size > 0) {
            onCopy(Array.from(selectedDays), sourceData);
        }
    };
    
    const [sourceYear, sourceMonth, sourceDay] = sourceData.date.split('-').map(Number);
    const sourceDateFormatted = new Date(sourceYear, sourceMonth - 1, sourceDay)
        .toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' });

    // Stop propagation to prevent closing modal when clicking inside
    const handleModalContentClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div
                className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 w-full max-w-lg transform transition-all flex flex-col"
                onClick={handleModalContentClick}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">
                        Kopírovat záznam z <span className="text-blue-600">{sourceDateFormatted}</span>
                    </h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="my-4 flex gap-2">
                    <button onClick={handleSelectWorkdays} className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors">Vybrat pracovní dny</button>
                    <button onClick={handleDeselectAll} className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors">Zrušit výběr</button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center overflow-y-auto max-h-64 pr-2">
                    {daysInMonth.map(day => {
                        const dateString = toDateString(day);
                        const isSelected = selectedDays.has(dateString);
                        const isSource = dateString === sourceData.date;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        const buttonClasses = `
                            p-2 rounded-md transition-colors text-sm
                            ${isSource ? 'bg-blue-600 text-white cursor-not-allowed' : ''}
                            ${isSelected ? 'bg-blue-200 text-blue-800 font-bold ring-2 ring-blue-400' : ''}
                            ${!isSource && !isSelected ? (isWeekend ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200') : ''}
                        `;

                        return (
                            <button
                                key={dateString}
                                onClick={() => handleToggleDay(dateString)}
                                disabled={isSource}
                                className={buttonClasses}
                                aria-pressed={isSelected}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                    >
                        Zrušit
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={selectedDays.size === 0}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        Kopírovat na {selectedDays.size} {selectedDays.size === 1 ? 'den' : (selectedDays.size > 1 && selectedDays.size < 5 ? 'dny' : 'dní')}
                    </button>
                </div>
            </div>
        </div>
    );
};
