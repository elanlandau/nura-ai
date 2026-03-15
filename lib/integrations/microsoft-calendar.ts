import { OAuthAccount, TimeSlot, CalendarAvailability } from '../types';
import { addDays, format } from 'date-fns';

export async function getMicrosoftCalendarAvailability(
  account: OAuthAccount,
  startDate: Date,
  endDate: Date
): Promise<CalendarAvailability[]> {
  const availability: CalendarAvailability[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    const slots: TimeSlot[] = [];

    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const timeSlots = [9, 10, 11, 14, 15, 16];
      timeSlots.forEach((hour) => {
        const start = new Date(currentDate);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(currentDate);
        end.setHours(hour + 1, 0, 0, 0);

        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          timezone: 'America/New_York',
        });
      });
    }

    availability.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      slots,
    });

    currentDate = addDays(currentDate, 1);
  }

  return availability;
}

export async function createMicrosoftCalendarEvent(
  account: OAuthAccount,
  params: {
    summary: string;
    description: string;
    start: TimeSlot;
    attendees: string[];
  }
): Promise<string> {
  console.log('Creating Microsoft Calendar event:', params);

  const mockEventId = `microsoft_event_${Date.now()}`;
  return mockEventId;
}
