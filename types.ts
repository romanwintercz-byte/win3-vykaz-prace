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

export interface TimeEntry {
  id: string;
  projectId: string | null;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  notes: string;
}

export interface WorkDay {
  date: string; // YYYY-MM-DD format
  entries: TimeEntry[];
  hours: number;
  overtime: number;
  absenceId: string | null;
  absenceHours: number; // Number of absence hours
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
