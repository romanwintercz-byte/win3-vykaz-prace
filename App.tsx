import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { TimesheetView } from './components/TimesheetView';
import { Summary } from './components/Summary';
import { Report } from './components/Report';
import { ProjectManager } from './components/ProjectManager';
import { AbsenceManager } from './components/AbsenceManager';
import { EmployeeManager } from './components/EmployeeManager';
import { DataManager } from './components/DataManager';
import { WorkDay, Project, Absence, Employee, FullBackup, EmployeeBackup, ProjectEntry } from './types';

// --- Holiday Calculation Logic ---
const getEasterSunday = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
};

const holidayCache: { [year: number]: { dates: Date[], strings: Set<string> } } = {};
const getCzechPublicHolidays = (year: number): { dates: Date[], strings: Set<string> } => {
    if (holidayCache[year]) return holidayCache[year];
    const easterSunday = getEasterSunday(year);
    const goodFriday = new Date(easterSunday);
    goodFriday.setUTCDate(easterSunday.getUTCDate() - 2);
    const easterMonday = new Date(easterSunday);
    easterMonday.setUTCDate(easterSunday.getUTCDate() + 1);
    const holidays = [
        new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 4, 1)),
        new Date(Date.UTC(year, 4, 8)), new Date(Date.UTC(year, 6, 5)),
        new Date(Date.UTC(year, 6, 6)), new Date(Date.UTC(year, 8, 28)),
        new Date(Date.UTC(year, 9, 28)), new Date(Date.UTC(year, 10, 17)),
        new Date(Date.UTC(year, 11, 24)), new Date(Date.UTC(year, 11, 25)),
        new Date(Date.UTC(year, 11, 26)), goodFriday, easterMonday
    ];
    const uniqueHolidays = [...new Map(holidays.map(d => [d.getTime(), d])).values()].sort((a, b) => a.getTime() - b.getTime());
    const holidayStrings = new Set(uniqueHolidays.map(d => d.toISOString().split('T')[0]));
    return holidayCache[year] = { dates: uniqueHolidays, strings: holidayStrings };
};

const isDayEmpty = (day: WorkDay | undefined): boolean => {
    if (!day) return true;
    return day.projectEntries.length === 0 && day.absenceId === null;
};

// Helper function to migrate old data structures for backward compatibility
const migrateWorkData = (workData: Record<string, any>): Record<string, WorkDay> => {
    return Object.fromEntries(Object.entries(workData).map(([date, day]) => {
        const newDay: WorkDay = {
            date: date,
            projectEntries: [],
            absenceId: day.absenceId || null,
            absenceHours: 0,
        };

        if (day.hasOwnProperty('absenceAmount')) {
            newDay.absenceHours = (Number(day.absenceAmount) || 0) * 8;
        } else {
            newDay.absenceHours = Number(day.absenceHours) || 0;
        }

        if (Array.isArray(day.projectEntries)) {
            newDay.projectEntries = day.projectEntries;
        } else if (day.hours > 0 || day.overtime > 0 || day.projectId) {
            newDay.projectEntries.push({
                id: `migrated-${date}`,
                projectId: day.projectId || null,
                hours: Number(day.hours) || 0,
                overtime: Number(day.overtime) || 0,
                notes: day.notes || '',
            });
        }
        
        return [date, newDay];
    }));
};


// --- Component ---
const initialProjects: Project[] = [
    { id: 'proj-1', name: 'Interní systém', color: '#0088FE', archived: false },
    { id: 'proj-2', name: 'Web pro klienta A', color: '#00C49F', archived: false },
    { id: 'proj-3', name: 'Mobilní aplikace', color: '#FFBB28', archived: false },
];
const initialAbsences: Absence[] = [
    { id: 'absence-1', name: 'Dovolená' }, { id: 'absence-2', name: 'Nemoc' },
    { id: 'absence-3', name: 'Lékař' }, { id: 'absence-4', name: 'Státní svátek' },
    { id: 'absence-5', name: 'Náhradní volno' }, { id: 'absence-6', name: 'Neplacené volno' },
    { id: 'absence-7', name: 'OČR (Ošetřování člena rodiny)' }, { id: 'absence-9', name: '60% (překážka v práci)' },
    { id: 'absence-8', name: 'Jiné' },
];
const initialEmployees: Employee[] = [{ id: 'emp-1', name: 'Jan Novák', archived: false }];

const App: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(initialEmployees[0]?.id || null);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [allWorkData, setAllWorkData] = useState<Record<string, Record<string, WorkDay>>>({ 'emp-1': {} });
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [absences, setAbsences] = useState<Absence[]>(initialAbsences);

    const [showReport, setShowReport] = useState<boolean>(false);
    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
    const [isAbsenceManagerOpen, setIsAbsenceManagerOpen] = useState<boolean>(false);
    const [isEmployeeManagerOpen, setIsEmployeeManagerOpen] = useState<boolean>(false);
    const [isDataManagerOpen, setIsDataManagerOpen] = useState<boolean>(false);

    const reportRef = useRef<HTMLDivElement>(null);

    const activeEmployee = useMemo(() => employees.find(e => e.id === activeEmployeeId), [employees, activeEmployeeId]);
    const activeWorkData = useMemo(() => allWorkData[activeEmployeeId || ''] || {}, [allWorkData, activeEmployeeId]);

    const publicHolidayAbsenceId = useMemo(() => absences.find(a => a.name.toLowerCase().includes('státní svátek'))?.id || null, [absences]);
    const holidaysForYear = useMemo(() => getCzechPublicHolidays(currentDate.getFullYear()), [currentDate]);

    useEffect(() => {
        if (!publicHolidayAbsenceId || !activeEmployeeId) return;
        const holidaysInMonth = holidaysForYear.dates.filter(h => h.getUTCMonth() === currentDate.getMonth());
        const holidayUpdates: Record<string, WorkDay> = {};
        holidaysInMonth.forEach(holiday => {
            const dateString = holiday.toISOString().split('T')[0];
            if (isDayEmpty(activeWorkData[dateString])) {
                holidayUpdates[dateString] = {
                    date: dateString,
                    projectEntries: [],
                    absenceId: publicHolidayAbsenceId,
                    absenceHours: 8,
                };
            }
        });
        if (Object.keys(holidayUpdates).length > 0) {
            setAllWorkData(prev => ({ ...prev, [activeEmployeeId]: { ...prev[activeEmployeeId], ...holidayUpdates } }));
        }
    }, [currentDate, holidaysForYear.dates, publicHolidayAbsenceId, activeEmployeeId, activeWorkData]);

    useEffect(() => {
        if (showReport && reportRef.current) {
            reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [showReport]);

    const currentMonthWorkDays = useMemo(() => {
        return Object.values(activeWorkData).filter(d => {
            const dayDate = new Date(d.date);
            return dayDate.getUTCMonth() === currentDate.getMonth() && dayDate.getUTCFullYear() === currentDate.getFullYear();
        });
    }, [activeWorkData, currentDate]);

    const handleDateChange = (newDate: Date) => { setCurrentDate(newDate); setShowReport(false); };
    const handleUpdateDay = useCallback((dayData: WorkDay) => { if (activeEmployeeId) setAllWorkData(p => ({ ...p, [activeEmployeeId]: { ...p[activeEmployeeId], [dayData.date]: dayData } })); }, [activeEmployeeId]);
    const handleUpdateMultipleDays = useCallback((daysData: WorkDay[]) => { if (activeEmployeeId) setAllWorkData(p => { const n = { ...p[activeEmployeeId] }; daysData.forEach(d => n[d.date] = d); return { ...p, [activeEmployeeId]: n }; }); }, [activeEmployeeId]);
    const handleAddProject = (name: string, color: string) => setProjects(p => [...p, { id: `proj-${Date.now()}`, name, color, archived: false }]);
    const handleUpdateProject = (updatedProject: Project) => setProjects(p => p.map(i => i.id === updatedProject.id ? updatedProject : i));
    const handleArchiveProject = (projectId: string, isArchived: boolean) => setProjects(p => p.map(i => i.id === projectId ? { ...i, archived: isArchived } : i));
    const handleAddAbsence = (name: string) => setAbsences(a => [...a, { id: `absence-${Date.now()}`, name }]);
    const handleDeleteAbsence = (id: string) => { if (publicHolidayAbsenceId === id) { alert("Nelze smazat chráněný typ absence 'Státní svátek'."); return; } if (window.confirm("Opravdu smazat?")) setAbsences(a => a.filter(i => i.id !== id)); };
    const handleAddEmployee = (name: string) => { const newEmp = { id: `emp-${Date.now()}`, name, archived: false }; setEmployees(e => [...e, newEmp]); setAllWorkData(d => ({ ...d, [newEmp.id]: {} })); setActiveEmployeeId(newEmp.id); };
    const handleUpdateEmployee = (updatedEmp: Employee) => setEmployees(e => e.map(i => i.id === updatedEmp.id ? updatedEmp : i));
    const handleArchiveEmployee = (employeeId: string, isArchived: boolean) => { setEmployees(e => e.map(i => i.id === employeeId ? { ...i, archived: isArchived } : i)); if (isArchived && activeEmployeeId === employeeId) setActiveEmployeeId(employees.find(e => !e.archived && e.id !== employeeId)?.id || null); };
    const handleToggleReport = () => { if (!activeEmployeeId) { alert("Vyberte zaměstnance."); return; } setShowReport(p => !p); };
    const handleActiveEmployeeChange = (id: string) => { setActiveEmployeeId(id); setShowReport(false); }

    const handleImportData = (jsonString: string) => {
        try {
            const data: FullBackup | EmployeeBackup | any = JSON.parse(jsonString);
            if (data.type === 'full_backup') {
                const backup = data as FullBackup;
                if (!backup.employees || !backup.projects || !backup.absences || !backup.allWorkData) throw new Error("Struktura zálohy není validní.");
                if (!window.confirm("Importovat kompletní zálohu? Všechna stávající data budou přepsána.")) return;
                
                const migratedData = Object.fromEntries(Object.entries(backup.allWorkData).map(([empId, workData]) => [empId, migrateWorkData(workData)]));
                setEmployees(backup.employees); setProjects(backup.projects); setAbsences(backup.absences); setAllWorkData(migratedData);
                setActiveEmployeeId(backup.employees.find(e => !e.archived)?.id || null);
            } else if (data.type === 'employee_data') {
                const backup = data as EmployeeBackup;
                if (!backup.employee || !backup.workData) throw new Error("Struktura zálohy zaměstnance není validní.");
                const { employee: importedEmp, workData: importedData } = backup;
                const existing = employees.find(e => e.id === importedEmp.id);
                const migratedData = migrateWorkData(importedData);

                if (existing) {
                    if (!window.confirm(`Sloučit data pro zaměstnance "${existing.name}"? Existující dny budou přepsány.`)) return;
                    setAllWorkData(p => ({ ...p, [existing.id]: { ...p[existing.id], ...migratedData } }));
                } else {
                    if (!window.confirm(`Zaměstnanec "${importedEmp.name}" neexistuje. Vytvořit nového a importovat data?`)) return;
                    setEmployees(e => [...e, importedEmp]); setAllWorkData(d => ({ ...d, [importedEmp.id]: migratedData })); setActiveEmployeeId(importedEmp.id);
                }
            } else throw new Error("Neznámý typ zálohy.");
            alert("Data byla úspěšně importována."); setIsDataManagerOpen(false);
        } catch (error) { console.error("Import error:", error); alert(`Chyba při importu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`); }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <div className="container mx-auto p-4 md:p-8">
                <div className="print:hidden">
                    {/* FIX: Pass correct handler functions to component props instead of using non-existent shorthand properties. */}
                    <Header {...{ currentDate, onDateChange: handleDateChange, employees, activeEmployeeId, onActiveEmployeeChange: handleActiveEmployeeChange, onToggleReport: handleToggleReport, showReport, onOpenProjectManager: () => setIsProjectManagerOpen(true), onOpenAbsenceManager: () => setIsAbsenceManagerOpen(true), onOpenEmployeeManager: () => setIsEmployeeManagerOpen(true), onOpenDataManager: () => setIsDataManagerOpen(true) }} />
                    <main className="mt-8 grid grid-cols-1 gap-8">
                        {activeEmployeeId ? <TimesheetView key={activeEmployeeId} {...{ currentDate, workData: activeWorkData, projects, absences, holidays: holidaysForYear.strings, onUpdateDay: handleUpdateDay, onUpdateMultipleDays: handleUpdateMultipleDays }} /> : <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-slate-200"><h2 className="text-xl font-semibold text-slate-700">Žádný aktivní zaměstnanec</h2><p className="text-slate-500 mt-2">Vytvořte nového zaměstnance nebo zrušte archivaci.</p></div>}
                    </main>
                    {activeEmployeeId && <Summary {...{ workData: activeWorkData, currentDate, projects, absences, holidays: holidaysForYear.strings, publicHolidayAbsenceId }} />}
                </div>
                {showReport && activeEmployee && <Report ref={reportRef} reportData={{ employeeName: activeEmployee.name, month: currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' }), days: currentMonthWorkDays, projects, absences }} />}
                <div className="print:hidden">
                    <ProjectManager {...{ isOpen: isProjectManagerOpen, onClose: () => setIsProjectManagerOpen(false), projects, onAddProject: handleAddProject, onUpdateProject: handleUpdateProject, onArchiveProject: handleArchiveProject }} />
                    <AbsenceManager {...{ isOpen: isAbsenceManagerOpen, onClose: () => setIsAbsenceManagerOpen(false), absences, onAddAbsence: handleAddAbsence, onDeleteAbsence: handleDeleteAbsence }} />
                    <EmployeeManager {...{ isOpen: isEmployeeManagerOpen, onClose: () => setIsEmployeeManagerOpen(false), employees, onAddEmployee: handleAddEmployee, onUpdateEmployee: handleUpdateEmployee, onArchiveEmployee: handleArchiveEmployee }} />
                    <DataManager {...{ isOpen: isDataManagerOpen, onClose: () => setIsDataManagerOpen(false), employees, projects, absences, allWorkData, onImportData: handleImportData }} />
                </div>
            </div>
        </div>
    );
};
export default App;