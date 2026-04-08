import { createEvent, EventAttributes } from 'ics';

export function generateICS(title: string, startTime: Date, description: string, durationMinutes: number = 60) {
  const date = new Date(startTime);
  const event: EventAttributes = {
    start: [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    ],
    duration: { minutes: durationMinutes },
    title: title,
    description: description,
    location: 'Pilates Studio',
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
  };

  return new Promise<string>((resolve, reject) => {
    createEvent(event, (error, value) => {
      if (error) {
        reject(error);
      }
      resolve(value);
    });
  });
}

export function downloadICS(icsString: string, filename: string) {
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
