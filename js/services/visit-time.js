export const VISIT_ZONE = 'Asia/Almaty';
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: VISIT_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

export function visitParts(value) {
  const parts = Object.fromEntries(formatter.formatToParts(value).map(({ type, value }) => [type, value]));
  return { date: parts.year + '-' + parts.month + '-' + parts.day, time: parts.hour + ':' + parts.minute };
}

export function plannedVisit(date, time, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Укажите дату и время прогулки.');
  const wallClock = Date.parse(date + 'T' + time + ':00Z');
  if (!Number.isFinite(wallClock) || new Date(wallClock).toISOString().slice(0, 16) !== date + 'T' + time) {
    throw new Error('Проверьте дату и время прогулки.');
  }
  const observed = visitParts(wallClock);
  const offset = Date.parse(observed.date + 'T' + observed.time + ':00Z') - wallClock;
  const instant = new Date(wallClock - offset);
  const confirmed = visitParts(instant);
  if (confirmed.date !== date || confirmed.time !== time) throw new Error('Это местное время недоступно. Выберите другое.');
  if (instant <= now) throw new Error('Выберите дату и время в будущем.');
  return instant.toISOString();
}
