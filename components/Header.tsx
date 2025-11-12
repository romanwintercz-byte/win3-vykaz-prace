import React from 'react';
import { Employee } from '../types';

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
}) => {
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + offset);
    onDateChange(newDate);
  };

  const activeEmployees = employees.filter(e => !e.archived);

  return (
    <header className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Výkaz Práce</h1>
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-slate-100 text-slate-500">
            <ChevronLeftIcon />
          </button>
          <span className="w-48 text-center font-semibold text-lg capitalize">
            {currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-slate-100 text-slate-500">
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
          onClick={onOpenEmployeeManager}
          className="flex items-center justify-center p-2 bg-white text-slate-600 border border-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          aria-label="Spravovat zaměstnance"
        >
          <UserGroupIcon />
        </button>
        <button
          onClick={onOpenProjectManager}
          className="flex items-center justify-center p-2 bg-white text-slate-600 border border-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          aria-label="Spravovat projekty"
        >
          <CogIcon />
        </button>
        <button
          onClick={onOpenAbsenceManager}
          className="flex items-center justify-center p-2 bg-white text-slate-600 border border-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
           aria-label="Spravovat absence"
        >
          <ClipboardListIcon />
        </button>
        <button
          onClick={onToggleReport}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition w-full sm:w-52"
        >
          {showReport ? 'Skrýt detailní výkaz' : 'Zobrazit detailní výkaz'}
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
const ClipboardListIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);
const UserGroupIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);