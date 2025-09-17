import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isBetween from 'dayjs/plugin/isBetween';

if (!dayjs.prototype.utc) {
  dayjs.extend(utc);
}
if (!(dayjs as any).__tzInitialized) {
  dayjs.extend(timezone);
  (dayjs as any).__tzInitialized = true;
}
if (!(dayjs as any).__advancedFormatInitialized) {
  dayjs.extend(advancedFormat);
  (dayjs as any).__advancedFormatInitialized = true;
}
if (!(dayjs as any).__isBetweenInitialized) {
  dayjs.extend(isBetween);
  (dayjs as any).__isBetweenInitialized = true;
}

export default dayjs;
