import React, { useState, useEffect, useMemo } from 'react';
import { WorkDay, Project, Absence, TimeEntry } from '../types';

interface DayEditorModalProps {
    dayData: WorkDay;
    onSave: (data: WorkDay) => void;
    onSaveAndCopy: (data: WorkDay) => void;
    onClose: () => void;
    projects: Project[];
    absences: Absence[];
}

// --- Helper Functions & Components ---

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

interface TimeAdjusterProps {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

const TimeAdjuster: React.FC<TimeAdjusterProps> = ({ value, onChange, disabled }) => {
  const handleAdjust = (minutes: number) => {
    if (disabled) return;
    const newTotalMinutes = timeToMinutes(value) + minutes;
    onChange(minutesToTime(newTotalMinutes));
  };

  return (
    <div className="flex items-center justify-center bg-white border border-slate-300 rounded-md shadow-sm overflow-hidden data-[disabled]:bg-slate-200" data-disabled={disabled ? '' : undefined}>
      <button 
        type="button" 
        onClick={() => handleAdjust(-15)} 
        disabled={disabled}
        className="px-2 py-1 text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Odebrat 15 minut"
      >
        -
      </button>
      <span className="font-mono text-center w-16 text-slate-800 text-sm">
        {value}
      </span>
      <button 
        type="button" 
        onClick={() => handleAdjust(15)} 
        disabled={disabled}
        className="px-2 py-1 text-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Přidat 15 minut"
      >
        +
      </button>
    </div>
  );
};


export const DayEditorModal: React.FC<DayEditorModalProps> = ({ dayData, onSave, onSaveAndCopy, onClose, projects, absences }) => {
    const [formData, setFormData] = useState<WorkDay>(dayData);
    
    const projectOptions = useMemo(() => {
        const activeProjects = projects.filter(p => !p.archived);
        const selectedProjectIds = new Set(formData.entries.map(e => e.projectId));
        const archivedUsedProjects = projects.filter(p => p.archived && selectedProjectIds.has(p.id));
        return [...archivedUsedProjects, ...activeProjects];
    }, [projects, formData.entries]);

    useEffect(() => {
        setFormData(dayData);
    }, [dayData]);
    
    useEffect(() => {
        if (formData.absenceId || formData.entries.length === 0) {
             if (formData.hours !== 0 || formData.overtime !== 0) {
                setFormData(prev => ({ ...prev, hours: 0, overtime: 0 }));
            }
            return;
        }

        const firstEntry = formData.entries[0];
        const lastEntry = formData.entries[formData.entries.length - 1];
        
        if (!firstEntry.startTime || !lastEntry.endTime) {
            if (formData.hours !== 0 || formData.overtime !== 0) {
                setFormData(prev => ({ ...prev, hours: 0, overtime: 0 }));
            }
            return;
        }

        const totalDurationMinutes = timeToMinutes(lastEntry.endTime) - timeToMinutes(firstEntry.startTime);
        
        let workedMinutes = 0;
        formData.entries.forEach(entry => {
            if (entry.startTime && entry.endTime) {
                workedMinutes += timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
            }
        });

        if (totalDurationMinutes / 60 > 4.5) {
            workedMinutes -= 30;
        }

        const totalWorkHours = Math.max(0, workedMinutes / 60);
        const newHours = Math.min(totalWorkHours, 8);
        const newOvertime = Math.max(0, totalWorkHours - 8);

        const roundedHours = parseFloat(newHours.toFixed(2));
        const roundedOvertime = parseFloat(newOvertime.toFixed(2));

        if (formData.hours !== roundedHours || formData.overtime !== roundedOvertime) {
            setFormData(prev => ({
                ...prev,
                hours: roundedHours,
                overtime: roundedOvertime,
            }));
        }
    }, [formData.entries, formData.absenceId, formData.hours, formData.overtime]);

    const handleAbsenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        const newAbsenceId = value === "" ? null : value;
        
        setFormData(prev => ({
            ...prev,
            absenceId: newAbsenceId,
            absenceAmount: newAbsenceId ? 1 : 0,
            entries: newAbsenceId ? [] : prev.entries,
        }));
    };
    
    const handleEntryChange = (id: string, field: keyof TimeEntry, value: string) => {
        setFormData(prev => {
            const newEntries = prev.entries.map(entry => 
                entry.id === id ? { ...entry, [field]: value } : entry
            );
            return { ...prev, entries: newEntries, absenceId: null, absenceAmount: 0 };
        });
    };
    
    const addEntry = () => {
        const lastEntry = formData.entries[formData.entries.length - 1];
        let newStartTime: string;
        let newEndTime: string;

        if (!lastEntry) { // This is the first entry
            newStartTime = "07:00";
            newEndTime = "15:30";
        } else {
            newStartTime = lastEntry.endTime || "08:00";
            
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();

            // If current time is before 15:30, set end time to 15:30
            if (currentHours < 15 || (currentHours === 15 && currentMinutes <= 30)) {
                newEndTime = "15:30";
            } else {
                // Otherwise, set it to one hour after the start time
                newEndTime = minutesToTime(timeToMinutes(newStartTime) + 60);
            }
        }

        const newEntry: TimeEntry = {
            id: `entry-${Date.now()}`,
            projectId: null,
            startTime: newStartTime,
            endTime: newEndTime,
            notes: '',
        };
        setFormData(prev => ({ ...prev, entries: [...prev.entries, newEntry], absenceId: null, absenceAmount: 0 }));
    };
    
    const removeEntry = (id: string) => {
        setFormData(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== id) }));
    };

    const handleSaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleDelete = () => {
        if (window.confirm('Opravdu si přejete smazat tento záznam? Všechna data pro tento den budou odstraněna.')) {
            onSave({
                date: formData.date,
                entries: [],
                hours: 0,
                overtime: 0,
                absenceId: null,
                absenceAmount: 0,
            });
        }
    };

    const handleSaveAndCopyClick = () => {
        onSaveAndCopy(formData);
    };

    const [year, month, day] = formData.date.split('-').map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day));
    const formattedDate = selectedDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

    const handleModalContentClick = (e: React.MouseEvent) => e.stopPropagation();
    
    const totalDuration = formData.entries.length > 0 ? timeToMinutes(formData.entries[formData.entries.length-1].endTime) - timeToMinutes(formData.entries[0].startTime) : 0;
    const showLunchBreak = totalDuration / 60 > 4.5;
    
    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <form
                onSubmit={handleSaveSubmit}
                className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6 w-full max-w-2xl transform transition-all"
                onClick={handleModalContentClick}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">
                        Upravit záznam pro <span className="text-blue-600">{formattedDate}</span>
                    </h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="absenceId" className="block text-sm font-medium text-slate-700">Typ absence</label>
                        <select
                            id="absenceId"
                            name="absenceId"
                            value={formData.absenceId ?? ''}
                            onChange={handleAbsenceChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">Žádná (pracovní den)</option>
                            {absences.map(absence => (
                                <option key={absence.id} value={absence.id}>{absence.name}</option>
                            ))}
                        </select>
                    </div>

                    {formData.absenceId && (
                        /* Absence amount radio buttons */
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Rozsah absence</label>
                            <div className="flex gap-4">
                               <label className="flex items-center">
                                    <input type="radio" name="absenceAmount" value={1} checked={formData.absenceAmount === 1} onChange={(e) => setFormData(p => ({...p, absenceAmount: 1}))} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-300" />
                                    <span className="ml-2 text-sm text-slate-700">Celý den</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" name="absenceAmount" value={0.5} checked={formData.absenceAmount === 0.5} onChange={(e) => setFormData(p => ({...p, absenceAmount: 0.5}))} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-300" />
                                    <span className="ml-2 text-sm text-slate-700">Půl dne</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {!formData.absenceId && (
                        <div className="space-y-3 pt-2">
                            {formData.entries.map((entry, index) => (
                                <div key={entry.id} className="grid grid-cols-[auto_auto_1fr_1fr_auto] gap-3 items-center p-2 bg-slate-50/80 rounded-lg">
                                    <TimeAdjuster value={entry.startTime} onChange={newValue => handleEntryChange(entry.id, 'startTime', newValue)} disabled={index > 0} />
                                    <TimeAdjuster value={entry.endTime} onChange={newValue => handleEntryChange(entry.id, 'endTime', newValue)} />
                                    <select value={entry.projectId ?? ""} onChange={e => handleEntryChange(entry.id, 'projectId', e.target.value)} className="w-full pl-3 pr-10 py-2 text-base bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                                        <option value="">Bez projektu</option>
                                        {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="text" placeholder="Poznámka..." value={entry.notes} onChange={e => handleEntryChange(entry.id, 'notes', e.target.value)} className="w-full rounded-md bg-white text-slate-800 border-slate-300 shadow-sm sm:text-sm"/>
                                    <button type="button" onClick={() => removeEntry(entry.id)} className="text-slate-400 hover:text-red-500 p-1 justify-self-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                             <button type="button" onClick={addEntry} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                Přidat další projekt / činnost
                            </button>
                        </div>
                    )}
                    
                    {formData.entries.length > 0 && (
                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Celková doba v práci:</span>
                                <span className="font-semibold text-slate-800">{(totalDuration / 60).toFixed(2)}h</span>
                            </div>
                            {showLunchBreak && (
                                <div className="flex justify-between text-yellow-700">
                                    <span className="">- Pauza na oběd:</span>
                                    <span className="font-semibold">0.50h</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                                <span className="font-bold text-slate-800">Odpracováno celkem:</span>
                                <span className="font-bold text-slate-900">{(formData.hours + formData.overtime).toFixed(2)}h</span>
                            </div>
                            {formData.overtime > 0 && (
                                <div className="flex justify-between text-orange-600">
                                    <span className="">z toho přesčas:</span>
                                    <span className="font-semibold">{formData.overtime.toFixed(2)}h</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-5 mt-5 border-t border-slate-200">
                     <button type="button" onClick={handleDelete} className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Smazat záznam</button>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">Zrušit</button>
                        <button type="button" onClick={handleSaveAndCopyClick} className="py-2 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Uložit a kopírovat...</button>
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Uložit změny</button>
                    </div>
                </div>
            </form>
        </div>
    );
};
