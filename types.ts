export interface Project {
    id: string;
    name: string;
    color: string;
    archived: boolean;
}

export interface Absence {
    id: string;
    name: string;
}

export interface Employee {
    id: string;
    name: string;
    archived: boolean;
}

export interface DayEntry {
    id: string;
    type: 'work' | 'absence' | 'break';
    startTime: string; // HH:mm
    endTime: string | null; // HH:mm
    projectId: string | null; // Only for 'work' type
    absenceId: string | null; // Only for 'absence' type
    notes: string;
    isAuto: boolean; // For auto-generated entries like lunch breaks
}


export type DayData = DayEntry[];

export interface ReportDay {
    date: string;
    entries: DayData;
}

export interface ReportData {
    employeeName: string;
    month: string;
    days: ReportDay[];
    projects: Project[];
    absences: Absence[];
}

export interface FullBackup {
    type: 'full_backup';
    employees: Employee[];
    projects: Project[];
    absences: Absence[];
    allWorkData: Record<string, Record<string, DayData>>;
}

export interface EmployeeBackup {
    type: 'employee_data';
    employee: Employee;
    workData: Record<string, DayData>;
}