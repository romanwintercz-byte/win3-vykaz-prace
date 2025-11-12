import React, { useState, useEffect } from 'react';
import { WorkDay, Project } from '../types';

interface DayEditorProps {
  dayData: WorkDay;
  onSave: (data: WorkDay) => void;
  projects: Project[];
}

export const DayEditor: React.FC<DayEditorProps> = ({ dayData, onSave, projects }) => {
  const [formData, setFormData] = useState<WorkDay>(dayData);
  // Fix: Use absenceId to check for absence, as `absence` property and `AbsenceType` are obsolete.
  const isAbsence = !!formData.absenceId;

  useEffect(() => {
    setFormData(dayData);
  }, [dayData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'projectId') {
        setFormData(prev => ({...prev, projectId: value === "" ? null : value}));
    } else {
        setFormData(prev => ({ ...prev, [name]: name === 'hours' || name === 'overtime' ? Number(value) : value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const selectedDate = new Date(formData.date);
  selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset()); // Adjust for timezone
  const formattedDate = selectedDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
      <h2 className="text-xl font-bold text-slate-900">
        Upravit záznam pro <span className="text-blue-600">{formattedDate}</span>
      </h2>
      
      <div className="space-y-4">
        {/* Fix: Removed obsolete absence selector which was based on `AbsenceType` and the `absence` property.
            This component is unused and DayEditorModal.tsx provides the correct implementation. */}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-slate-700">Pracovní doba (h)</label>
            <input
              type="number"
              id="hours"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              disabled={isAbsence}
              min="0"
              step="0.5"
              className="mt-1 block w-full rounded-md bg-white text-slate-800 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed"
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
              disabled={isAbsence}
              min="0"
              step="0.5"
              className="mt-1 block w-full rounded-md bg-white text-slate-800 border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-slate-700">Projekt / Činnost</label>
            <select
                id="projectId"
                name="projectId"
                value={formData.projectId ?? ""}
                onChange={handleChange}
                disabled={isAbsence}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed"
            >
                <option value="">Bez projektu</option>
                {projects.map(project => (
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
      </div>
      
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Uložit změny
      </button>
    </form>
  );
};
