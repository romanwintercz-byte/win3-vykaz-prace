import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

import { Header } from './components/Header';
import { TimesheetView } from './components/TimesheetView';
import { Summary } from './components/Summary';
import { Report } from './components/Report';
import { ProjectManager } from './components/ProjectManager';
import { AbsenceManager } from './components/AbsenceManager';
import { EmployeeManager } from './components/EmployeeManager';

import { WorkDay, Project, Absence, Employee } from './types';

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
    // Dates are UTC, so we create them as such to avoid timezone issues.
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
        new Date(Date.UTC(year, 0, 1)),   // New Year's Day
        new Date(Date.UTC(year, 4, 1)),   // Labour Day
        new Date(Date.UTC(year, 4, 8)),   // Liberation Day
        new Date(Date.UTC(year, 6, 5)),   // Saints Cyril and Methodius Day
        new Date(Date.UTC(year, 6, 6)),   // Jan Hus Day
        new Date(Date.UTC(year, 8, 28)),  // St. Wenceslas Day (Czech Statehood Day)
        new Date(Date.UTC(year, 9, 28)),  // Independent Czechoslovak State Day
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
    return day.hours === 0 && day.overtime === 0 && day.projectId === null && day.absenceId === null && day.absenceAmount === 0 && day.notes === '';
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
            hours: 0,
            overtime: 0,
            projectId: null,
            absenceId: publicHolidayAbsenceId,
            absenceAmount: 1,
            notes: 'Státní svátek'
          };
      }
    });

    if (Object.keys(holidayUpdates).length > 0) {
      setAllWorkData(prev => ({ 
        ...prev, 
        [activeEmployeeId]: { ...prev[activeEmployeeId], ...holidayUpdates }
      }));
    }
  }, [currentDate, holidaysForYear, publicHolidayAbsenceId, activeWorkData, activeEmployeeId]);


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

  const handleUpdateDay = (dayData: WorkDay) => {
    if (!activeEmployeeId) return;
    setAllWorkData(prev => ({ 
      ...prev,
      [activeEmployeeId]: { ...prev[activeEmployeeId], [dayData.date]: dayData }
    }));
  };

  const handleUpdateMultipleDays = (daysData: WorkDay[]) => {
    if (!activeEmployeeId) return;
    setAllWorkData(prev => {
      const newEmployeeData = { ...prev[activeEmployeeId] };
      daysData.forEach(day => {
        newEmployeeData[day.date] = day;
      });
      return { ...prev, [activeEmployeeId]: newEmployeeData };
    });
  };

  const handleAddProject = (name: string) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
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

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setAllWorkData(prev => {
      const newData = { ...prev };
      Object.keys(newData).forEach(empId => {
        Object.keys(newData[empId]).forEach(date => {
          if (newData[empId][date].projectId === projectId) {
            newData[empId][date].projectId = null;
          }
        });
      });
      return newData;
    });
  };

  const handleAddAbsence = (name: string) => {
    const newAbsence: Absence = {
      id: `absence-${Date.now()}`,
      name,
    };
    setAbsences(prev => [...prev, newAbsence]);
  };

  const handleDeleteAbsence = (absenceId: string) => {
    if (window.confirm(`Opravdu si přejete smazat tento typ absence? Bude odstraněn ze všech existujících záznamů.`)) {
        setAbsences(prev => prev.filter(a => a.id !== absenceId));
        setAllWorkData(prev => {
          const newData = { ...prev };
          Object.keys(newData).forEach(empId => {
            Object.keys(newData[empId]).forEach(date => {
              if (newData[empId][date].absenceId === absenceId) {
                newData[empId][date].absenceId = null;
                newData[empId][date].absenceAmount = 0;
              }
            });
          });
          return newData;
        });
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

  const handleDeleteEmployee = (employeeId: string) => {
    if (window.confirm(`Opravdu si přejete smazat tohoto zaměstnance? Veškerá jeho data budou nevratně odstraněna.`)) {
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      setAllWorkData(prev => {
        const newData = { ...prev };
        delete newData[employeeId];
        return newData;
      });
      if (activeEmployeeId === employeeId) {
        const newActive = employees.find(e => !e.archived && e.id !== employeeId);
        setActiveEmployeeId(newActive?.id || null);
      }
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="container mx-auto p-4 md:p-8">
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

        <ProjectManager 
            isOpen={isProjectManagerOpen}
            onClose={() => setIsProjectManagerOpen(false)}
            projects={projects}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
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
            onDeleteEmployee={handleDeleteEmployee}
        />
      </div>
    </div>
  );
};

export default App;