import React, { useState, useEffect, useMemo } from 'react';
import { WorkDay, Project, Absence, ProjectEntry } from '../types';

interface DayEditorModalProps {
    dayData: WorkDay;
    onSave: (data: WorkDay) => void;
    onSaveAndCopy: (data: WorkDay) => void;
    onClose: () => void;
    projects: Project[];
    absences: Absence[];
}

export const DayEditorModal: React.FC<DayEditorModalProps> = ({ dayData, onSave, onSaveAndCopy, onClose, projects, absences }) => {
    const [formData, setFormData] = useState<WorkDay>(dayData);
    
    const projectOptions = useMemo(() => {
        const activeProjects = projects.filter(p => !p.archived);
        const selectedProjectIds = new Set(formData.projectEntries.map(e => e.projectId));
        const archivedUsedProjects = projects.filter(p => p.archived && selectedProjectIds.has(p.id));
        return [...archivedUsedProjects, ...activeProjects];
    }, [projects, formData.projectEntries]);

    useEffect(() => {
        setFormData(dayData);
    }, [dayData]);
    
    const handleAbsenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        const newAbsenceId = value === "" ? null : value;
        
        setFormData(prev => ({
            ...prev,
            absenceId: newAbsenceId,
            // Set default absence hours if a new absence is selected, otherwise clear it
            absenceHours: newAbsenceId ? (prev.absenceHours > 0 ? prev.absenceHours : 8) : 0, 
        }));
    };
    
    const handleEntryChange = (id: string, field: keyof ProjectEntry, value: string | number) => {
        setFormData(prev => {
            const newEntries = prev.projectEntries.map(entry => 
                entry.id === id ? { ...entry, [field]: value } : entry
            );
            return { ...prev, projectEntries: newEntries };
        });
    };
    
    const addEntry = () => {
        const newEntry: ProjectEntry = {
            id: `proj-entry-${Date.now()}`,
            projectId: null,
            hours: 8,
            overtime: 0,
            notes: '',
        };
        setFormData(prev => ({ ...prev, projectEntries: [...prev.projectEntries, newEntry]}));
    };
    
    const removeEntry = (id: string) => {
        setFormData(prev => ({ ...prev, projectEntries: prev.projectEntries.filter(e => e.id !== id) }));
    };

    const handleSaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleDelete = () => {
        if (window.confirm('Opravdu si přejete smazat tento záznam? Všechna data pro tento den budou odstraněna.')) {
            onSave({
                date: formData.date,
                projectEntries: [],
                absenceId: null,
                absenceHours: 0,
            });
        }
    };

    const handleAbsenceHoursChange = (newValue: number) => {
        setFormData(prev => ({...prev, absenceHours: Math.max(0, newValue)}));
    }

    const handleSaveAndCopyClick = () => {
        onSaveAndCopy(formData);
    };

    const [year, month, day] = formData.date.split('-').map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day));
    const formattedDate = selectedDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

    const handleModalContentClick = (e: React.MouseEvent) => e.stopPropagation();
    
    const totals = useMemo(() => {
        return formData.projectEntries.reduce((acc, entry) => {
            acc.hours += Number(entry.hours) || 0;
            acc.overtime += Number(entry.overtime) || 0;
            return acc;
        }, { hours: 0, overtime: 0 });
    }, [formData.projectEntries]);
    
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
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                        <div className="pt-2">
                            <label htmlFor="absenceHours" className="block text-sm font-medium text-slate-700 mb-2">Počet hodin absence</label>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center bg-white border border-slate-300 rounded-md shadow-sm overflow-hidden">
                                     <button type="button" onClick={() => handleAbsenceHoursChange(formData.absenceHours - 0.5)} className="px-3 py-1 text-lg font-bold text-slate-600 hover:bg-slate-100">-</button>
                                     <input 
                                        type="number"
                                        id="absenceHours"
                                        value={formData.absenceHours}
                                        onChange={e => handleAbsenceHoursChange(parseFloat(e.target.value) || 0)}
                                        step="0.5"
                                        min="0"
                                        className="w-20 text-center font-mono bg-white text-slate-800 border-x border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                                     />
                                     <button type="button" onClick={() => handleAbsenceHoursChange(formData.absenceHours + 0.5)} className="px-3 py-1 text-lg font-bold text-slate-600 hover:bg-slate-100">+</button>
                                </div>
                                <button type="button" onClick={() => handleAbsenceHoursChange(4)} className="px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md">4h</button>
                                <button type="button" onClick={() => handleAbsenceHoursChange(8)} className="px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md">8h</button>
                            </div>
                        </div>
                    )}
                    
                    <div className="border-t border-slate-200 pt-4 mt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Projekty / Činnosti</label>
                        <div className="space-y-3">
                            {formData.projectEntries.map((entry) => (
                                <div key={entry.id} className="grid grid-cols-[1fr_auto_auto_1fr_auto] gap-3 items-center p-2 bg-slate-50/80 rounded-lg">
                                    <select value={entry.projectId ?? ""} onChange={e => handleEntryChange(entry.id, 'projectId', e.target.value)} className="w-full pl-3 pr-10 py-2 text-base bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                                        <option value="">Bez projektu</option>
                                        {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" step="0.5" min="0" value={entry.hours} onChange={e => handleEntryChange(entry.id, 'hours', Number(e.target.value))} className="w-20 text-center rounded-md bg-white text-slate-800 border-slate-300 shadow-sm sm:text-sm" placeholder="Hodiny" />
                                    <input type="number" step="0.5" min="0" value={entry.overtime} onChange={e => handleEntryChange(entry.id, 'overtime', Number(e.target.value))} className="w-20 text-center rounded-md bg-white text-slate-800 border-slate-300 shadow-sm sm:text-sm" placeholder="Přesčas" />
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
                    </div>
                </div>
                
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between border-t-2 border-slate-300 pt-2">
                        <span className="font-bold text-slate-800">Celkem odpracováno:</span>
                        <span className="font-bold text-slate-900">{(totals.hours + totals.overtime).toFixed(2)}h</span>
                    </div>
                    {totals.overtime > 0 && (
                        <div className="flex justify-between text-orange-600">
                            <span className="">z toho přesčas:</span>
                            <span className="font-semibold">{totals.overtime.toFixed(2)}h</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-5 mt-5 border-t border-slate-200">
                     <button type="button" onClick={handleDelete} className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Smazat záznam</button>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">Zrušit</button>
                        <button
                            type="button"
                            onClick={handleSaveAndCopyClick}
                            className="py-2 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Uložit a kopírovat...
                        </button>
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Uložit změny</button>
                    </div>
                </div>
            </form>
        </div>
    );
};