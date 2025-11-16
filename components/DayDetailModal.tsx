import React, { useState, useMemo, useEffect } from 'react';
import { DayData, DayEntry, Project, Absence } from '@/types';
import { timeToMinutes, minutesToTime, calculateDuration } from '@/utils/timeUtils';

interface DayDetailModalProps {
    date: string;
    dayData: DayData;
    onSave: (date: string, data: DayData) => void;
    onSaveAndCopy: (date: string, data: DayData) => void;
    onClose: () => void;
    projects: Project[];
    absences: Absence[];
}

// --- Helper Functions ---
const LUNCH_BREAK_DURATION_MINUTES = 30;
const WORK_BLOCK_FOR_LUNCH_MINUTES = 4.5 * 60; // 270 minutes

const processTimeline = (entries: DayEntry[], finalEndTime?: string): DayEntry[] => {
    let processedEntries: DayEntry[] = [...entries].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    // Set end times based on the next entry's start time
    for (let i = 0; i < processedEntries.length; i++) {
        if (processedEntries[i].type === 'break' && processedEntries[i].isAuto) continue;

        const nextEntry = processedEntries[i + 1];
        if (nextEntry) {
            processedEntries[i].endTime = nextEntry.startTime;
        } else { // This is the last entry
            // Use the explicit finalEndTime if provided. Otherwise, keep the existing endTime if it exists, falling back to null.
            processedEntries[i].endTime = finalEndTime !== undefined ? finalEndTime : (processedEntries[i].endTime || null);
        }
    }
    
    processedEntries = processedEntries.filter(e => !(e.type === 'break' && e.isAuto));

    let continuousWorkMinutes = 0;
    let blockStartTimeMinutes = -1;
    const finalWithBreaks: DayEntry[] = [];
    let lastProcessedEntryEndTime = -1;

    for (const entry of processedEntries) {
        const entryStartTimeMinutes = timeToMinutes(entry.startTime);
        
        if (lastProcessedEntryEndTime > 0 && entryStartTimeMinutes > lastProcessedEntryEndTime) {
            continuousWorkMinutes = 0;
            blockStartTimeMinutes = -1;
        }

        if (entry.type === 'work' && entry.endTime) {
            if (blockStartTimeMinutes < 0) {
                blockStartTimeMinutes = entryStartTimeMinutes;
            }
            
            const entryDuration = calculateDuration(entry.startTime, entry.endTime) * 60;
            const newTotalContinuous = continuousWorkMinutes + entryDuration;

            if (newTotalContinuous > WORK_BLOCK_FOR_LUNCH_MINUTES && continuousWorkMinutes < WORK_BLOCK_FOR_LUNCH_MINUTES) {
                const minutesIntoBlockForBreak = WORK_BLOCK_FOR_LUNCH_MINUTES - continuousWorkMinutes;
                const breakStartTimeMinutes = entryStartTimeMinutes + minutesIntoBlockForBreak;
                const breakEndTimeMinutes = breakStartTimeMinutes + LUNCH_BREAK_DURATION_MINUTES;
                
                const originalEndTimeMinutes = timeToMinutes(entry.endTime);

                if(breakStartTimeMinutes > entryStartTimeMinutes) {
                    finalWithBreaks.push({ ...entry, endTime: minutesToTime(breakStartTimeMinutes) });
                }
                
                finalWithBreaks.push({
                    id: `break-${Date.now()}`, type: 'break',
                    startTime: minutesToTime(breakStartTimeMinutes), endTime: minutesToTime(breakEndTimeMinutes),
                    notes: 'Oběd (automaticky)', isAuto: true, projectId: null, absenceId: null,
                });

                if (originalEndTimeMinutes > breakEndTimeMinutes) {
                     finalWithBreaks.push({
                        ...entry, id: `entry-${Date.now()}-${Math.random()}`,
                        startTime: minutesToTime(breakEndTimeMinutes), endTime: minutesToTime(originalEndTimeMinutes),
                    });
                }
                
                continuousWorkMinutes = originalEndTimeMinutes > breakEndTimeMinutes ? (originalEndTimeMinutes - breakEndTimeMinutes) : 0;
                blockStartTimeMinutes = breakEndTimeMinutes;

            } else {
                finalWithBreaks.push(entry);
                continuousWorkMinutes += entryDuration;
            }
        } else {
            finalWithBreaks.push(entry);
            continuousWorkMinutes = 0;
            blockStartTimeMinutes = -1;
        }
        
        if (entry.endTime) {
            lastProcessedEntryEndTime = timeToMinutes(entry.endTime);
        }
    }

    return finalWithBreaks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
};


export const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, dayData, onSave, onSaveAndCopy, onClose, projects, absences }) => {
    const [entries, setEntries] = useState<DayEntry[]>(dayData);
    const [newActivityTime, setNewActivityTime] = useState<string>('07:00');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedAbsenceId, setSelectedAbsenceId] = useState<string | null>(null);
    const [activityType, setActivityType] = useState<'work' | 'absence'>('work');
    const [isEndingDay, setIsEndingDay] = useState<boolean>(false);
    const [endDayTime, setEndDayTime] = useState<string>('15:30');
    
    const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);

    const adjustTime = (currentTime: string, adjustment: number): string => {
        const currentMinutes = timeToMinutes(currentTime);
        const newMinutes = currentMinutes + adjustment;
        const dayMinutes = 24 * 60;
        return minutesToTime((newMinutes + dayMinutes) % dayMinutes);
    };

    useEffect(() => {
        const lastEntry = [...entries].sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)).pop();
        if (lastEntry && lastEntry.endTime) {
            setNewActivityTime(lastEntry.endTime);
        } else if (entries.length === 0) {
            setNewActivityTime('07:00');
        }

        if (activeProjects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(activeProjects[0].id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayData, activeProjects]);

    const handleAddActivity = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newEntry: DayEntry = {
            id: `entry-${Date.now()}`,
            type: activityType,
            startTime: newActivityTime,
            endTime: null,
            projectId: activityType === 'work' ? selectedProjectId : null,
            absenceId: activityType === 'absence' ? selectedAbsenceId : null,
            notes: '',
            isAuto: false,
        };

        const updatedEntries = processTimeline([...entries, newEntry]);
        setEntries(updatedEntries);
        
        const lastTime = timeToMinutes(newActivityTime) + 60;
        setNewActivityTime(minutesToTime(lastTime));
    };
    
    const handleEndDayClick = () => {
        setIsEndingDay(true);
    };

    const handleConfirmEndDay = (e: React.FormEvent) => {
        e.preventDefault();
        if (endDayTime && /^\d{1,2}:\d{2}$/.test(endDayTime)) {
            const finalEntries = processTimeline(entries, endDayTime);
            setEntries(finalEntries);
            setIsEndingDay(false);
        } else {
            alert("Neplatný formát času. Použijte prosím HH:MM.");
        }
    };

    const handleDeleteEntry = (id: string) => {
        const remainingEntries = entries.filter(e => e.id !== id);
        const lastEntry = remainingEntries.length > 0 ? remainingEntries[remainingEntries.length - 1] : null;
        const finalEndTime = lastEntry && remainingEntries.every(e => e.endTime) ? lastEntry.endTime! : undefined;
        setEntries(processTimeline(remainingEntries, finalEndTime));
    };

    const getFinalizedEntries = () => {
        const isDayOpen = entries.length > 0 && entries.some(e => e.endTime === null);
        if (isDayOpen) {
            return processTimeline(entries, "15:30");
        }
        return entries;
    };

    const handleSaveAndClose = () => {
        onSave(date, getFinalizedEntries());
    };
    
    const handleSaveAndCopyClick = () => {
        onSaveAndCopy(date, getFinalizedEntries());
    };

    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day));
    const formattedDate = selectedDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    
    const timeline = useMemo(() => processTimeline(entries, isEndingDay ? endDayTime : undefined), [entries, isEndingDay, endDayTime]);

    const totalWorkHours = timeline.reduce((sum, e) => {
        if (e.type === 'work') {
            return sum + calculateDuration(e.startTime, e.endTime);
        }
        return sum;
    }, 0);

    const regularHours = Math.min(totalWorkHours, 8);
    const overtime = Math.max(0, totalWorkHours - 8);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 w-full max-w-2xl transform transition-all flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            Časová osa pro <span className="text-blue-600">{formattedDate}</span>
                        </h2>
                         <p className="text-sm font-semibold text-slate-600 mt-1">
                            Celkem odpracováno: {regularHours.toFixed(2)}h 
                            {overtime > 0 && <span className="text-orange-600"> + {overtime.toFixed(2)}h přesčas</span>}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <CloseIcon />
                    </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border-y border-slate-200 py-3">
                    {timeline.map(entry => (
                        <div key={entry.id} className={`p-2 rounded-lg border flex items-center gap-4 text-sm ${entry.type === 'absence' ? 'bg-yellow-50 border-yellow-200' : entry.type === 'break' ? 'bg-slate-100 border-slate-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="font-mono font-semibold text-slate-700">
                                {entry.startTime} - {entry.endTime || '???'}
                            </div>
                            <div className="flex-grow font-semibold">
                                {entry.type === 'work' ? projects.find(p => p.id === entry.projectId)?.name || 'Bez projektu'
                                 : entry.type === 'absence' ? absences.find(a => a.id === entry.absenceId)?.name || 'Absence'
                                 : entry.notes}
                            </div>
                            <div className="font-semibold text-slate-500 w-20 text-right">
                                ({calculateDuration(entry.startTime, entry.endTime).toFixed(2)} h)
                            </div>
                             {!entry.isAuto && (
                                <button onClick={() => handleDeleteEntry(entry.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-md"><TrashIcon /></button>
                             )}
                        </div>
                    ))}
                    {timeline.length === 0 && <p className="text-slate-500 text-center py-4">Den je prázdný. Začněte přidáním první aktivity.</p>}
                </div>
                
                {isEndingDay ? (
                    <form onSubmit={handleConfirmEndDay} className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                        <h3 className="font-semibold text-blue-800">Ukončit pracovní den</h3>
                        <div className="flex items-center gap-4">
                            <label htmlFor="endTime" className="font-medium text-slate-700">Čas konce:</label>
                            <div className="flex items-center max-w-xs flex-grow">
                                <button type="button" onClick={() => setEndDayTime(adjustTime(endDayTime, -15))} className="px-3 py-2 border border-r-0 border-slate-300 rounded-l-md bg-slate-100 hover:bg-slate-200 font-mono focus:z-10">-</button>
                                <input 
                                    type="time" 
                                    id="endTime"
                                    value={endDayTime} 
                                    step="900"
                                    onChange={(e) => setEndDayTime(e.target.value)} 
                                    required 
                                    className="w-full p-2 border-t border-b border-slate-300 bg-white text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 relative z-10"
                                />
                                <button type="button" onClick={() => setEndDayTime(adjustTime(endDayTime, 15))} className="px-3 py-2 border border-l-0 border-slate-300 rounded-r-md bg-slate-100 hover:bg-slate-200 font-mono focus:z-10">+</button>
                            </div>
                            <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                                Potvrdit konec
                            </button>
                            <button type="button" onClick={() => setIsEndingDay(false)} className="py-2 px-4 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                                Zrušit
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleAddActivity} className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                        <h3 className="font-semibold">{entries.length > 0 ? 'Začátek nové aktivity' : 'Začátek pracovní doby'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setActivityType('work')} className={`px-3 py-1 rounded-md text-sm font-semibold ${activityType === 'work' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Práce</button>
                                <button type="button" onClick={() => setActivityType('absence')} className={`px-3 py-1 rounded-md text-sm font-semibold ${activityType === 'absence' ? 'bg-yellow-500 text-white' : 'bg-white border'}`}>Absence</button>
                            </div>

                            {activityType === 'work' ? (
                                <select value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800">
                                    {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            ) : (
                                <select value={selectedAbsenceId || ''} onChange={(e) => setSelectedAbsenceId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800">
                                    {absences.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            )}
                            
                            <div className="flex items-center">
                                <div className="flex items-center flex-grow">
                                    <button type="button" onClick={() => setNewActivityTime(adjustTime(newActivityTime, -15))} className="px-3 py-2 border border-r-0 border-slate-300 rounded-l-md bg-slate-100 hover:bg-slate-200 font-mono focus:z-10">-</button>
                                    <input 
                                        type="time" 
                                        value={newActivityTime} 
                                        step="900" 
                                        onChange={(e) => setNewActivityTime(e.target.value)} 
                                        required 
                                        className="w-full p-2 border-t border-b border-slate-300 bg-white text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 relative z-10" 
                                    />
                                    <button type="button" onClick={() => setNewActivityTime(adjustTime(newActivityTime, 15))} className="px-3 py-2 border border-l-0 border-slate-300 rounded-r-md bg-slate-100 hover:bg-slate-200 font-mono focus:z-10">+</button>
                                </div>
                                <button type="submit" className="ml-2 flex-shrink-0 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">Přidat</button>
                            </div>
                        </div>
                    </form>
                )}


                <div className="grid grid-cols-2 justify-end gap-3 pt-5 mt-5 border-t border-slate-200">
                    <div className="flex justify-start">
                        {!isEndingDay && (
                            <button type="button" onClick={handleEndDayClick} className="py-2 px-4 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50">
                                Ukončit pracovní den...
                            </button>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={handleSaveAndCopyClick} className="py-2 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50">
                            Uložit a kopírovat...
                        </button>
                        <button type="button" onClick={handleSaveAndClose} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            Uložit a zavřít
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- ICONS ---
const CloseIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const TrashIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;