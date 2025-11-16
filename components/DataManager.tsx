import React, { useState, useRef, useEffect } from 'react';
// Fix: Replaced incorrect 'WorkDay' type with 'DayData' to match the application's data structure.
import { Employee, Project, Absence, DayData, FullBackup, EmployeeBackup } from '@/types';

interface DataManagerProps {
    isOpen: boolean;
    onClose: () => void;
    employees: Employee[];
    projects: Project[];
    absences: Absence[];
    allWorkData: Record<string, Record<string, DayData>>;
    onImportData: (jsonString: string) => void;
}

export const DataManager: React.FC<DataManagerProps> = ({ isOpen, onClose, employees, projects, absences, allWorkData, onImportData }) => {
    const activeEmployees = employees.filter(e => !e.archived);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(activeEmployees[0]?.id || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const firstActive = employees.find(e => !e.archived);
            if(firstActive) {
                setSelectedEmployeeId(firstActive.id);
            }
        }
    }, [isOpen, employees]);

    const handleExportAllData = () => {
        const data: FullBackup = {
            type: 'full_backup',
            employees,
            projects,
            absences,
            allWorkData,
        };
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `zaloha_vykazu_${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportEmployeeData = () => {
        if (!selectedEmployeeId) {
            alert("Prosím, vyberte zaměstnance pro export.");
            return;
        }
        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee) {
            alert("Vybraný zaměstnanec nebyl nalezen.");
            return;
        }
        const workData = allWorkData[selectedEmployeeId] || {};
        const data: EmployeeBackup = {
            type: 'employee_data',
            employee,
            workData,
        };
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        const employeeName = employee.name.replace(/\s+/g, '-').toLowerCase();
        a.href = url;
        a.download = `vykaz_${employeeName}_${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    onImportData(text);
                }
            };
            reader.onerror = () => {
                alert("Nepodařilo se přečíst soubor.");
            };
            reader.readAsText(file);
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 w-full max-w-2xl transform transition-all" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Správa dat</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><CloseIcon /></button>
                </div>

                <div className="space-y-6">
                    <details className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <summary className="font-semibold text-slate-700 cursor-pointer">Nápověda: Jaký je rozdíl mezi typy záloh?</summary>
                        <div className="mt-2 text-sm text-slate-600 space-y-2 prose prose-sm max-w-none">
                            <p><strong>Kompletní záloha (Exportovat všechna data):</strong></p>
                            <ul>
                                <li>Vytvoří soubor s <strong>veškerými daty</strong> aplikace: všichni zaměstnanci, všechny projekty, absence a kompletní historie výkazů.</li>
                                <li>Při importu této zálohy dojde k <strong>úplnému přepsání</strong> všech stávajících dat v cílové aplikaci.</li>
                                <li><strong>Použití:</strong> Ideální pro přesun dat na nový počítač nebo pro vytvoření kompletního bodu obnovy.</li>
                            </ul>
                            <p><strong>Data zaměstnance (Exportovat data zaměstnance):</strong></p>
                            <ul>
                                <li>Vytvoří menší soubor, který obsahuje pouze informace a výkazy pro <strong>jednoho konkrétního zaměstnance</strong>.</li>
                                <li>Při importu dojde k <strong>chytrému sloučení</strong>: pokud zaměstnanec již existuje, jeho data se aktualizují (přidají se nové dny, přepíší stávající). Pokud neexistuje, budete dotázáni na jeho vytvoření.</li>
                                <li><strong>Použití:</strong> Perfektní pro měsíční předávání podkladů mzdové účetní, která si může data jednoduše přidat ke svým stávajícím záznamům.</li>
                            </ul>
                        </div>
                    </details>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-3">Export (Záloha)</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleExportAllData} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
                                <DownloadIcon /> Exportovat všechna data
                            </button>
                            <div className="flex-1 flex items-center gap-2 border border-slate-300 rounded-lg p-2">
                                <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="flex-grow bg-white text-slate-800 border-0 focus:ring-0 rounded-md">
                                    {activeEmployees.length > 0 ? activeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>) : <option disabled>Žádní aktivní zaměstnanci</option>}
                                </select>
                                <button onClick={handleExportEmployeeData} disabled={!selectedEmployeeId} className="px-3 py-1 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 transition">
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-3">Import (Obnova)</h3>
                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition">
                            <UploadIcon /> Importovat ze souboru (.json)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
// --- ICONS ---
const CloseIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const DownloadIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const UploadIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;