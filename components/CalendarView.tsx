import React from 'react';
import { WorkDay, Project } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  workData: Record<string, WorkDay>;
  selectedDay: string;
  onDaySelect: (day: string) => void;
  projects: Project[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ currentDate, workData, selectedDay, onDaySelect, projects }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const daysInMonth = [];
  // Add blank days for the start of the month
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday is 0
  for (let i = 0; i < startDayOfWeek; i++) {
    daysInMonth.push(<div key={`empty-start-${i}`} className="border-r border-b border-slate-200"></div>);
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    const dayData = workData[dateString];
    
    const isSelected = dateString === selectedDay;
    const isToday = dateString === new Date().toISOString().split('T')[0];

    const dayClasses = `
      relative p-2 h-28 border-r border-b border-slate-200 cursor-pointer transition duration-150 ease-in-out
      hover:bg-blue-50
      ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
    `;

    const numberClasses = `
      absolute top-2 right-2 flex items-center justify-center h-7 w-7 rounded-full text-sm font-semibold
      ${isToday ? 'bg-blue-600 text-white' : 'text-slate-500'}
      ${isSelected && !isToday ? 'bg-blue-200 text-blue-800' : ''}
    `;
    
    let dayContent = null;
    if (dayData) {
        const project = dayData.projectId ? projects.find(p => p.id === dayData.projectId) : null;
        // Fix: Use absenceId to check for absence, as `absence` property and `AbsenceType` are obsolete.
        // Since this component doesn't receive the `absences` list to find the name, a generic text is displayed.
        if (dayData.absenceId) {
            dayContent = <div className="mt-6 px-1 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-md truncate">Absence</div>
        } else if(dayData.hours > 0 || dayData.overtime > 0) {
            dayContent = (
                <div className="mt-6 text-left text-xs space-y-1">
                    <div className="flex items-center gap-1.5">
                        {project && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></div>}
                        <p className="font-semibold text-slate-700 truncate">{project?.name || 'Bez projektu'}</p>
                    </div>
                    <p className="text-slate-500 pl-3.5">
                        {dayData.hours > 0 && `${dayData.hours}h`}
                        {dayData.hours > 0 && dayData.overtime > 0 && ' + '}
                        {dayData.overtime > 0 && <span className="font-bold text-orange-600">{dayData.overtime}h</span>}
                    </p>
                </div>
            )
        }
    }


    daysInMonth.push(
      <div key={day} className={dayClasses} onClick={() => onDaySelect(dateString)}>
        <div className={numberClasses}>{day}</div>
        {dayContent}
      </div>
    );
  }

  const weekdays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  return (
    <div>
        <div className="grid grid-cols-7 border-t border-l border-slate-200">
            {weekdays.map(day => (
                <div key={day} className="py-2 text-center font-bold text-slate-600 border-r border-b border-slate-200 bg-slate-50">
                {day}
                </div>
            ))}
        </div>
        <div className="grid grid-cols-7 border-l border-slate-200">
            {daysInMonth}
        </div>
    </div>
  );
};
