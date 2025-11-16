import React from 'react';
import { Employee } from '@/types';

interface HeaderProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    employees: Employee[];
    activeEmployeeId: string | null;
    onActiveEmployeeChange: (id: string) => void;
    onToggleReport: () => void;
    showReport: boolean;
    onOpenProjectManager: () => void;
    onOpenAbsenceManager: () => void;
    onOpenEmployeeManager: () => void;
    onOpenDataManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    currentDate,
    onDateChange,
    employees,
    activeEmployeeId,
    onActiveEmployeeChange,
    onToggleReport,
    showReport,
    onOpenProjectManager,
    onOpenAbsenceManager,
    onOpenEmployeeManager,
    onOpenDataManager,
}) => {
    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + offset);
        onDateChange(newDate);
    };

    const activeEmployees = employees.filter(e => !e.archived);

    return (
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Výkaz Práce</h1>
                <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-slate-100 text-slate-500" aria-label="Předchozí měsíc">
                        <ChevronLeftIcon />
                    </button>
                    <span className="w-40 text-center font-semibold text-lg capitalize">
                        {currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-slate-100 text-slate-500" aria-label="Následující měsíc">
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end w-full md:w-auto">
                <select
                    value={activeEmployeeId || ''}
                    onChange={(e) => onActiveEmployeeChange(e.target.value)}
                    className="px-4 py-2 bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full md:w-auto min-w-[150px]"
                    aria-label="Vybrat zaměstnance"
                >
                    {activeEmployees.length === 0 && <option disabled value="">Žádní zaměstnanci</option>}
                    {activeEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                </select>
                <button
                    onClick={onOpenDataManager}
                    className="flex items-center justify-center p-2 bg-white text-slate-600 border border-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                    aria-label="Správa dat"
                >
                    <DatabaseIcon />
                </button>
                <div className="relative group">
                    <button
                        className="flex items-center justify-center p-2 bg-white text-slate-600 border border-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                        aria-label="Spravovat"
                    >
                         <CogIcon />
                    </button>
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-opacity z-10">
                        <a onClick={onOpenEmployeeManager} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">Zaměstnanci</a>
                        <a onClick={onOpenProjectManager} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">Projekty</a>
                        <a onClick={onOpenAbsenceManager} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">Typy absencí</a>
                    </div>
                </div>
                <button
                    onClick={onToggleReport}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition w-full sm:w-auto"
                >
                    {showReport ? 'Skrýt výkaz' : 'Zobrazit výkaz'}
                </button>
            </div>
        </header>
    );
};

const ChevronLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const CogIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const DatabaseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7a8 8 0 0116 0M12 21v-4" />
    </svg>
);