import React, { useState, useEffect, useMemo } from 'react';
import { WorkDay, Project, Absence } from '../types';

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
  const isFullDayAbsence = !!formData.absenceId && formData.absenceAmount === 1;

  const projectOptions = useMemo(() => {
    const activeProjects = projects.filter(p => !p.archived);
    const selectedProject = formData.projectId ? projects.find(p => p.id === formData.projectId) : null;

    if (selectedProject && selectedProject.archived) {
      // If the currently selected project is archived, add it to the top of the list
      // so the user can see it but can switch away from it.
      return [selectedProject, ...activeProjects];
    }
    
    return activeProjects;
  }, [projects, formData.projectId]);

  useEffect(() => {
    setFormData(dayData);
  }, [dayData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const newState = { ...prev };

        if (name === 'absenceId') {
            const newAbsenceId = value === "" ? null : value;
            newState.absenceId = newAbsenceId;
            if (newAbsenceId) {
                // Default to full day when selecting a new absence
                newState.absenceAmount = 1;
                newState.hours = 0;
                newState.overtime = 0;
                newState.projectId = null;
            } else {
                // Clear absence amount if no absence is selected
                newState.absenceAmount = 0;
            }
        } else if (name === 'absenceAmount') {
            const newAmount = Number(value);
            newState.absenceAmount = newAmount;
            if (newAmount === 1) { // If switching to full day, clear work hours
                newState.hours = 0;
                newState.overtime = 0;
                newState.projectId = null;
            }
        } else if (name === 'projectId') {
            newState.projectId = value === "" ? null : value;
        } else {
            const numValue = name === 'hours' || name === 'overtime' ? Number(value) : value;
            newState[name as keyof WorkDay] = numValue as never;
        }
        return newState;
    });
  };
  
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = () => {
    if (confirm('Opravdu si přejete smazat tento záznam? Všechna data pro tento den budou odstraněna.')) {
        onSave({
            date: formData.date,
            hours: 0,
            overtime: 0,
            projectId: null,
            absenceId: null,
            absenceAmount: 0,
            notes: ''
        });
    }
  };

  const handleSaveAndCopyClick = () => {
    onSaveAndCopy(formData);
  };
  
  // Parse date string as UTC to avoid timezone issues with `new Date(string)`
  const [year, month, day] = formData.date.split('-').map(Number);
  const selectedDate = new Date(Date.UTC(year, month - 1, day));
  const formattedDate = selectedDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  // Stop propagation to prevent closing modal when clicking inside
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };


  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
        onClick={onClose} // Close on backdrop click
    >
      <form 
        onSubmit={handleSaveSubmit} 
        className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6 w-full max-w-md transform transition-all"
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
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Žádná</option>
              {absences.map(absence => (
                <option key={absence.id} value={absence.id}>{absence.name}</option>
              ))}
            </select>
          </div>

          {formData.absenceId && (
            <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Rozsah absence</label>
                <div className="flex gap-4">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="absenceAmount"
                            value={1}
                            checked={formData.absenceAmount === 1}
                            onChange={handleChange}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-300"
                        />
                        <span className="ml-2 text-sm text-slate-700">Celý den</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="absenceAmount"
                            value={0.5}
                            checked={formData.absenceAmount === 0.5}
                            onChange={handleChange}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-300"
                        />
                        <span className="ml-2 text-sm text-slate-700">Půl dne</span>
                    </label>
                </div>
            </div>
            )}
          
          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-slate-700">Projekt / Činnost</label>
            <select
                id="projectId"
                name="projectId"
                value={formData.projectId ?? ""}
                onChange={handleChange}
                disabled={isFullDayAbsence}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
                <option value="">Bez projektu</option>
                {projectOptions.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Poznámky</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md bg-white text-slate-800 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hours" className="block text-sm font-medium text-slate-700">Pracovní doba (h)</label>
              <input
                type="number"
                id="hours"
                name="hours"
                value={formData.hours}
                onChange={handleChange}
                disabled={isFullDayAbsence}
                min="0"
                step="0.5"
                className="mt-1 block w-full rounded-md bg-white text-slate-800 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="overtime" className="block text-sm font-medium text-slate-700">Přesčas (h)</label>
              <input
                type="number"
                id="overtime"
                name="overtime"
                value={formData.overtime}
                onChange={handleChange}
                disabled={isFullDayAbsence}
                min="0"
                step="0.5"
                className="mt-1 block w-full rounded-md bg-white text-slate-800 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-5 mt-5 border-t border-slate-200">
             <button
                type="button"
                onClick={handleDelete}
                className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Smazat záznam
            </button>
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                >
                    Zrušit
                </button>
                <button
                    type="button"
                    onClick={handleSaveAndCopyClick}
                    className="py-2 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Uložit a kopírovat...
                </button>
                <button
                    type="submit"
                    className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Uložit změny
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};