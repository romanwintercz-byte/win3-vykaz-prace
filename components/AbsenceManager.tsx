import React, { useState } from 'react';
import { Absence } from '../types';

interface AbsenceManagerProps {
    isOpen: boolean;
    onClose: () => void;
    absences: Absence[];
    onAddAbsence: (name: string) => void;
    onDeleteAbsence: (id: string) => void;
}

export const AbsenceManager: React.FC<AbsenceManagerProps> = ({ isOpen, onClose, absences, onAddAbsence, onDeleteAbsence }) => {
    const [newAbsenceName, setNewAbsenceName] = useState('');

    const handleAddAbsence = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAbsenceName.trim()) {
            onAddAbsence(newAbsenceName.trim());
            setNewAbsenceName('');
        }
    };

    if (!isOpen) {
        return null;
    }

    const handleModalContentClick = (e: React.MouseEvent) => e.stopPropagation();
    
    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div
                className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 w-full max-w-lg transform transition-all"
                onClick={handleModalContentClick}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-900">Správa typů absencí</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <CloseIcon />
                    </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {absences.map(absence => (
                        <div key={absence.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="font-semibold">{absence.name}</span>
                            <button onClick={() => onDeleteAbsence(absence.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md"><TrashIcon /></button>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleAddAbsence} className="mt-6 flex gap-2">
                    <input
                        type="text"
                        value={newAbsenceName}
                        onChange={(e) => setNewAbsenceName(e.target.value)}
                        placeholder="Název nové absence (interní)"
                        className="flex-grow px-4 py-2 bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition"
                        disabled={!newAbsenceName.trim()}
                    >
                        Přidat absenci
                    </button>
                </form>
            </div>
        </div>
    );
};

const TrashIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const CloseIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;