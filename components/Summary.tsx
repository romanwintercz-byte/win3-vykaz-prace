import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { WorkDay, Project, Absence } from '../types';

interface SummaryProps {
  workData: Record<string, WorkDay>;
  currentDate: Date;
  projects: Project[];
  absences: Absence[];
}

interface ProjectData {
    name: string;
    value: number;
    fill: string;
}

const OTHER_COLOR = '#8884d8';

// Helper function to determine if a color is dark
const isColorDark = (hexColor: string): boolean => {
    if (!hexColor || hexColor.length < 4) return false;
    // Remove '#' if present
    const color = hexColor.charAt(0) === '#' ? hexColor.substring(1) : hexColor;
    
    // Handle 3-digit hex
    const fullHex = color.length === 3 ? color.split('').map(char => char + char).join('') : color;

    if (fullHex.length !== 6) return false;

    // Convert to RGB
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    // Calculate luminance using the YIQ formula
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    // Return true if color is dark, false if light
    return yiq < 128;
};


export const Summary: React.FC<SummaryProps> = ({ workData, currentDate, projects, absences }) => {
  const summaryData = useMemo(() => {
    const monthData = Object.values(workData).filter(
      (d: WorkDay) => new Date(d.date).getMonth() === currentDate.getMonth()
    );

    let totalHours = 0;
    let totalOvertime = 0;
    const projectHours: Record<string, number> = {};
    const absenceDays: Record<string, number> = {};

    monthData.forEach((day: WorkDay) => {
      totalHours += day.hours;
      totalOvertime += day.overtime;

      if (day.absenceId && day.absenceAmount > 0) {
          absenceDays[day.absenceId] = (absenceDays[day.absenceId] || 0) + day.absenceAmount;
      }
      
      // We sum project hours regardless of absence, as half-days are possible
      if (day.hours > 0 || day.overtime > 0) {
           const projectKey = day.projectId || 'other';
           projectHours[projectKey] = (projectHours[projectKey] || 0) + day.hours + day.overtime;
      }
    });

    const projectChartData: ProjectData[] = Object.entries(projectHours)
        .map(([projectId, value]) => {
            const project = projects.find(p => p.id === projectId);
            return { 
                name: project?.name || 'Bez projektu',
                value,
                fill: project?.color || OTHER_COLOR,
            };
        })
        .sort((a, b) => b.value - a.value);
    
    const vacationId = absences.find(a => a.name === 'Dovolená')?.id;
    const sickId = absences.find(a => a.name === 'Nemoc')?.id;
    
    const vacationDays = vacationId ? (absenceDays[vacationId] || 0) : 0;
    const sickDays = sickId ? (absenceDays[sickId] || 0) : 0;

    return { totalHours, totalOvertime, vacationDays, sickDays, projectChartData };
  }, [workData, currentDate, projects, absences]);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, ...props }: any) => {
    // Hide label for very small slices to avoid clutter
    if (percent < 0.05) {
      return null;
    }
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const sliceColor = props.fill;
    const textColor = isColorDark(sliceColor) ? '#FFFFFF' : '#1f2937'; // slate-800

    return (
      <text
        x={x}
        y={y}
        fill={textColor}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-semibold pointer-events-none"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Měsíční přehled</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Odpracováno hodin" value={`${summaryData.totalHours}h`} />
        <SummaryCard title="Přesčasy" value={`${summaryData.totalOvertime}h`} color="text-orange-600" />
        <SummaryCard title="Dovolená" value={`${summaryData.vacationDays} dnů`} color="text-green-600"/>
        <SummaryCard title="Nemoc" value={`${summaryData.sickDays} dnů`} color="text-red-600" />
      </div>
      {summaryData.projectChartData.length > 0 &&
        <div className="mt-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Rozložení práce</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={summaryData.projectChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={renderCustomizedLabel}
                        >
                            {summaryData.projectChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value}h`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      }
    </div>
  );
};


interface SummaryCardProps {
    title: string;
    value: string;
    color?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, color = 'text-blue-600' }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
);