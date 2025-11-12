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

export interface WorkDay {
  date: string; // YYYY-MM-DD format
  hours: number;
  overtime: number;
  projectId: string | null;
  absenceId: string | null;
  absenceAmount: number; // 0 for no absence, 0.5 for half, 1 for full
  notes: string;
}

export interface ReportData {
    employeeName: string;
    month: string;
    days: WorkDay[];
    projects: Project[];
    absences: Absence[];
}

export interface FullBackup {
  type: 'full_backup';
  employees: Employee[];
  projects: Project[];
  absences: Absence[];
  allWorkData: Record<string, Record<string, WorkDay>>;
}

export interface EmployeeBackup {
  type: 'employee_data';
  employee: Employee;
  workData: Record<string, WorkDay>;
}