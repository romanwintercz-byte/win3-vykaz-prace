// Converts "HH:mm" time string to the number of minutes from midnight.
export const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Converts a number of minutes from midnight to a "HH:mm" time string.
export const minutesToTime = (minutes: number): string => {
    if (isNaN(minutes) || minutes < 0) return '00:00';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    const hours = h.toString().padStart(2, '0');
    const mins = m.toString().padStart(2, '0');
    return `${hours}:${mins}`;
};

// Calculates the duration in hours between two "HH:mm" time strings.
export const calculateDuration = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    if (endMinutes < startMinutes) return 0; // Should not happen in a valid timeline
    const durationMinutes = endMinutes - startMinutes;
    return durationMinutes / 60;
};