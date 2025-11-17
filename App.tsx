import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { TimesheetView } from './components/TimesheetView';
import { Summary } from './components/Summary';
import { Report } from './components/Report';
import { ProjectManager } from './components/ProjectManager';
import { AbsenceManager } from './components/AbsenceManager';
import { EmployeeManager } from './components/EmployeeManager';
import { DataManager } from './components/DataManager';
import { WorkDay, Project, Absence, Employee, FullBackup, EmployeeBackup } from './types';

// --- Holiday Calculation Logic ---
// Function to calculate Easter Sunday using the Gregorian algorithm (Meeus/Jones/Butcher)
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

// Cache holidays by year
const holidayCache: { [year: number]: { dates: Date[], strings: Set<string> } } = {};
const getCzechPublicHolidays = (year: number): { dates: Date[], strings: Set<string> } => {
    if (holidayCache[year]) {
        return holidayCache[year];
    }

    const easterSunday = getEasterSunday(year);
    const goodFriday = new Date(easterSunday);
    goodFriday.setUTCDate(easterSunday.getUTCDate() - 2);
    const easterMonday = new Date(easterSunday);
    easterMonday.setUTCDate(easterSunday.getUTCDate() + 1);

    const holidays = [
        new Date(Date.UTC(year, 0, 1)), // New Year's Day
        new Date(Date.UTC(year, 4, 1)), // Labour Day
        new Date(Date.UTC(year, 4, 8)), // Liberation Day
        new Date(Date.UTC(year, 6, 5)), // Saints Cyril and Methodius Day
        new Date(Date.UTC(year, 6, 6)), // Jan Hus Day
        new Date(Date.UTC(year, 8, 28)), // St. Wenceslas Day (Czech Statehood Day)
        new Date(Date.UTC(year, 9, 28)), // Independent Czechoslovak State Day
        new Date(Date.UTC(year, 10, 17)), // Struggle for Freedom and Democracy Day
        new Date(Date.UTC(year, 11, 24)), // Christmas Eve
        new Date(Date.UTC(year, 11, 25)), // Christmas Day
        new Date(Date.UTC(year, 11, 26)), // St. Stephen's Day
        goodFriday,
        easterMonday
    ];
    
    const uniqueHolidays = holidays
        .map(d => d.getTime())
        .filter((t, i, a) => a.indexOf(t) === i)
        .map(t => new Date(t))
        .sort((a, b) => a.getTime() - b.getTime());

    const toDateString = (date: Date): string => date.toISOString().split('T')[0];
    const holidayStrings = new Set<string>();
    uniqueHolidays.forEach(d => {
        holidayStrings.add(toDateString(d));
    });

    const result = { dates: uniqueHolidays, strings: holidayStrings };
    holidayCache[year] = result;
    return result;
};

const isDayEmpty = (day: WorkDay): boolean => {
    return day.entries.length === 0 && day.absenceId === null;
};

// Helper function to migrate old data structure for backward compatibility
const migrateWorkData = (workData: Record<string, any>): Record<string, WorkDay> => {
    return Object.entries(workData).reduce((acc, [date, day]) => {
        const migratedDay = { ...day };
        // Convert absenceAmount to absenceHours
        if (migratedDay.hasOwnProperty('absenceAmount') && !migratedDay.hasOwnProperty('absenceHours')) {
            migratedDay.absenceHours = (migratedDay.absenceAmount || 0) * 8;
            delete migratedDay.absenceAmount;
        } else if (!migratedDay.hasOwnProperty('absenceHours')) {
            migratedDay.absenceHours = 0;
        }

        // Ensure other properties exist for forward compatibility if needed
        if (!migratedDay.entries) migratedDay.entries = [];
        if (migratedDay.hours === undefined) migratedDay.hours = 0;
        if (migratedDay.overtime === undefined) migratedDay.overtime = 0;
        if (migratedDay.absenceId === undefined) migratedDay.absenceId = null;
        
        acc[date] = migratedDay as WorkDay;
        return acc;
    }, {} as Record<string, WorkDay>);
};


// --- Component ---
const initialProjects: Project[] = [
    { id: 'proj-1', name: 'Interní systém', color: '#0088FE', archived: false },
    { id: 'proj-2', name: 'Web pro klienta A', color: '#00C49F', archived: false },
    { id: 'proj-3', name: 'Mobilní aplikace', color: '#FFBB28', archived: false },
];

const initialAbsences: Absence[] = [
    { id: 'absence-1', name: 'Dovolená' },
    { id: 'absence-2', name: 'Nemoc' },
    { id: 'absence-3', name: 'Lékař' },
    { id: 'absence-4', name: 'Státní svátek' },
    { id: 'absence-5', name: 'Náhradní volno' },
    { id: 'absence-6', name: 'Neplacené volno' },
    { id: 'absence-7', name: 'OČR (Ošetřování člena rodiny)' },
    { id: 'absence-9', name: '60% (překážka v práci)' },
    { id: 'absence-8', name: 'Jiné' },
];

const initialEmployees: Employee[] = [
    { id: 'emp-1', name: 'Jan Novák', archived: false }
];

const App: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(initialEmployees[0]?.id || null);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [allWorkData, setAllWorkData] = useState<Record<string, Record<string, WorkDay>>>({
        'emp-1': {}
    });
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

    const publicHolidayAbsenceId = useMemo(() =>
        absences.find(a => a.name.toLowerCase().includes('státní svátek'))?.id || null
    , [absences]);

    const holidaysForYear = useMemo(() => {
        const year = currentDate.getFullYear();
        return getCzechPublicHolidays(year);
    }, [currentDate]);

    useEffect(() => {
        if (!publicHolidayAbsenceId || !activeEmployeeId) return;

        const toDateString = (date: Date): string => date.toISOString().split('T')[0];
        const holidaysInMonth = holidaysForYear.dates.filter(
            (holiday) => holiday.getUTCMonth() === currentDate.getMonth()
        );

        const holidayUpdates: Record<string, WorkDay> = {};
        holidaysInMonth.forEach(holiday => {
            const dateString = toDateString(holiday);
            const existingData = activeWorkData[dateString];
            if (!existingData || isDayEmpty(existingData)) {
                holidayUpdates[dateString] = {
                    date: dateString,
                    entries: [],
                    hours: 0,
                    overtime: 0,
                    absenceId: publicHolidayAbsenceId,
                    absenceHours: 8,
                };
            }
        });

        if (Object.keys(holidayUpdates).length > 0) {
            setAllWorkData(prev => ({
                ...prev,
                [activeEmployeeId]: { ...prev[activeEmployeeId], ...holidayUpdates }
            }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate, holidaysForYear.dates, publicHolidayAbsenceId, activeEmployeeId]);

    useEffect(() => {
        if (showReport && reportRef.current) {
            const timer = setTimeout(() => {
                reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showReport]);

    const currentMonthWorkDays = useMemo(() => {
        return Object.values(activeWorkData).filter((d: WorkDay) => {
            const dayDate = new Date(d.date);
            return dayDate.getUTCMonth() === currentDate.getMonth() && dayDate.getUTCFullYear() === currentDate.getFullYear();
        });
    }, [activeWorkData, currentDate]);

    const handleDateChange = (newDate: Date) => {
        setCurrentDate(newDate);
        setShowReport(false);
    };

    const handleUpdateDay = useCallback((dayData: WorkDay) => {
        if (!activeEmployeeId) return;
        setAllWorkData(prev => ({
            ...prev,
            [activeEmployeeId]: { ...prev[activeEmployeeId], [dayData.date]: dayData }
        }));
    }, [activeEmployeeId]);

    const handleUpdateMultipleDays = useCallback((daysData: WorkDay[]) => {
        if (!activeEmployeeId) return;
        setAllWorkData(prev => {
            const newEmployeeData = { ...prev[activeEmployeeId] };
            daysData.forEach(day => {
                newEmployeeData[day.date] = day;
            });
            return { ...prev, [activeEmployeeId]: newEmployeeData };
        });
    }, [activeEmployeeId]);

    const handleAddProject = (name: string, color: string) => {
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name,
            color,
            archived: false,
        };
        setProjects(prev => [...prev, newProject]);
    };

    const handleUpdateProject = (updatedProject: Project) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    };

    const handleArchiveProject = (projectId: string, isArchived: boolean) => {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, archived: isArchived } : p));
    };

    const handleAddAbsence = (name: string) => {
        const newAbsence: Absence = {
            id: `absence-${Date.now()}`,
            name,
        };
        setAbsences(prev => [...prev, newAbsence]);
    };

    const handleDeleteAbsence = (id: string) => {
        if (publicHolidayAbsenceId === id) {
            alert("Nelze smazat absenci 'Státní svátek', je používána pro automatické vyplňování.");
            return;
        }
        if (window.confirm("Opravdu si přejete smazat tento typ absence? Záznamy s touto absencí mohou přestat být správně zobrazovány.")) {
            setAbsences(prev => prev.filter(a => a.id !== id));
        }
    };
    
    const handleAddEmployee = (name: string) => {
        const newEmployee: Employee = {
            id: `emp-${Date.now()}`,
            name,
            archived: false,
        };
        setEmployees(prev => [...prev, newEmployee]);
        setAllWorkData(prev => ({ ...prev, [newEmployee.id]: {} }));
        setActiveEmployeeId(newEmployee.id);
    };

    const handleUpdateEmployee = (updatedEmployee: Employee) => {
        setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
    };

    const handleArchiveEmployee = (employeeId: string, isArchived: boolean) => {
        setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, archived: isArchived } : e));
        if (isArchived && activeEmployeeId === employeeId) {
            const newActive = employees.find(e => !e.archived && e.id !== employeeId);
            setActiveEmployeeId(newActive?.id || null);
        }
    };

    const handleToggleReport = () => {
        if (!activeEmployeeId) {
            alert("Prosím, vyberte nebo vytvořte zaměstnance.");
            return;
        }
        setShowReport(prev => !prev);
    };

    const handleActiveEmployeeChange = (id: string) => {
        setActiveEmployeeId(id);
        setShowReport(false);
    }

    const handleImportData = (jsonString: string) => {
        try {
            const data: FullBackup | EmployeeBackup | any = JSON.parse(jsonString);

            if (data.type === 'full_backup') {
                const backupData = data as FullBackup;
                if (!backupData.employees || !backupData.projects || !backupData.absences || !backupData.allWorkData) {
                    throw new Error("Soubor s kompletní zálohou nemá správnou strukturu.");
                }
                if (window.confirm("Opravdu si přejete importovat kompletní zálohu? Všechna stávající data v aplikaci budou přepsána daty ze souboru. Tuto akci nelze vrátit zpět.")) {
                    
                    const migratedAllWorkData: Record<string, Record<string, WorkDay>> = {};
                    for (const empId in backupData.allWorkData) {
                        if (Object.prototype.hasOwnProperty.call(backupData.allWorkData, empId)) {
                            migratedAllWorkData[empId] = migrateWorkData(backupData.allWorkData[empId]);
                        }
                    }

                    setEmployees(backupData.employees);
                    setProjects(backupData.projects);
                    setAbsences(backupData.absences);
                    setAllWorkData(migratedAllWorkData);
                    const firstActiveEmployee = backupData.employees.find(e => !e.archived);
                    setActiveEmployeeId(firstActiveEmployee?.id || null);
                    alert("Data byla úspěšně importována.");
                    setIsDataManagerOpen(false);
                }
            } else if (data.type === 'employee_data') {
                const employeeData = data as EmployeeBackup;
                if (!employeeData.employee || !employeeData.workData) {
                    throw new Error("Soubor s daty zaměstnance nemá správnou strukturu.");
                }
                const { employee: importedEmployee, workData: importedWorkData } = employeeData;
                
                const existingEmployee = employees.find(e => e.id === importedEmployee.id);
                const migratedWorkData = migrateWorkData(importedWorkData);

                if (existingEmployee) {
                    if (window.confirm(`Chystáte se importovat a sloučit data pro zaměstnance "${existingEmployee.name}". Existující záznamy pro stejné dny budou přepsány novými. Přejete si pokračovat?`)) {
                        const currentEmployeeData = allWorkData[existingEmployee.id] || {};
                        const mergedData = { ...currentEmployeeData, ...migratedWorkData };
                        setAllWorkData(prev => ({ ...prev, [existingEmployee.id]: mergedData }));
                        alert("Data zaměstnance byla úspěšně sloučena.");
                        setIsDataManagerOpen(false);
                    }
                } else {
                    if (window.confirm(`Zaměstnanec "${importedEmployee.name}" nebyl v aplikaci nalezen. Přejete si ho založit jako nového a importovat jeho data?`)) {
                        setEmployees(prev => [...prev, importedEmployee]);
                        setAllWorkData(prev => ({ ...prev, [importedEmployee.id]: migratedWorkData }));
                        setActiveEmployeeId(importedEmployee.id);
                        alert("Nový zaměstnanec byl vytvořen a data byla importována.");
                        setIsDataManagerOpen(false);
                    }
                }
            } else {
                throw new Error("Neznámý typ souboru pro import.");
            }
        } catch (error) {
            console.error("Chyba při importu dat:", error);
            alert(`Při importu došlo k chybě: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <div className="container mx-auto p-4 md:p-8">
                <div className="print:hidden">
                    <Header
                        currentDate={currentDate}
                        onDateChange={handleDateChange}
                        employees={employees}
                        activeEmployeeId={activeEmployeeId}
                        onActiveEmployeeChange={handleActiveEmployeeChange}
                        onToggleReport={handleToggleReport}
                        showReport={showReport}
                        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
                        onOpenAbsenceManager={() => setIsAbsenceManagerOpen(true)}
                        onOpenEmployeeManager={() => setIsEmployeeManagerOpen(true)}
                        onOpenDataManager={() => setIsDataManagerOpen(true)}
                    />
                    
                    <main className="mt-8 grid grid-cols-1 gap-8">
                        {activeEmployeeId ? (
                            <TimesheetView
                                key={activeEmployeeId} // Force re-render on employee change
                                currentDate={currentDate}
                                workData={activeWorkData}
                                projects={projects}
                                absences={absences}
                                holidays={holidaysForYear.strings}
                                onUpdateDay={handleUpdateDay}
                                onUpdateMultipleDays={handleUpdateMultipleDays}
                            />
                        ) : (
                            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-700">Žádný aktivní zaměstnanec</h2>
                                <p className="text-slate-500 mt-2">Vytvořte nového zaměstnance nebo zrušte archivaci stávajícího pro zobrazení výkazu.</p>
                            </div>
                        )}
                    </main>
                    
                    {activeEmployeeId && <Summary workData={activeWorkData} currentDate={currentDate} projects={projects} absences={absences} holidays={holidaysForYear.strings} publicHolidayAbsenceId={publicHolidayAbsenceId} />}
                </div>

                {showReport && activeEmployee && (
                  <Report 
                    ref={reportRef}
                    reportData={{
                      employeeName: activeEmployee.name,
                      month: currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' }),
                      days: currentMonthWorkDays,
                      projects: projects,
                      absences: absences
                    }}
                  />
                )}

                <div className="print:hidden">
                    <ProjectManager 
                        isOpen={isProjectManagerOpen}
                        onClose={() => setIsProjectManagerOpen(false)}
                        projects={projects}
                        onAddProject={handleAddProject}
                        onUpdateProject={handleUpdateProject}
                        onArchiveProject={handleArchiveProject}
                    />
                    <AbsenceManager 
                        isOpen={isAbsenceManagerOpen}
                        onClose={() => setIsAbsenceManagerOpen(false)}
                        absences={absences}
                        onAddAbsence={handleAddAbsence}
                        onDeleteAbsence={handleDeleteAbsence}
                    />
                    <EmployeeManager
                        isOpen={isEmployeeManagerOpen}
                        onClose={() => setIsEmployeeManagerOpen(false)}
                        employees={employees}
                        onAddEmployee={handleAddEmployee}
                        onUpdateEmployee={handleUpdateEmployee}
                        onArchiveEmployee={handleArchiveEmployee}
                    />
                    <DataManager
                      isOpen={isDataManagerOpen}
                      onClose={() => setIsDataManagerOpen(false)}
                      employees={employees}
                      projects={projects}
                      absences={absences}
                      allWorkData={allWorkData}
                      onImportData={handleImportData}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;
