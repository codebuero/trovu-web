export default class DateType {
  static async parse(str, locale) {
    const now = new Date();
    let date, matches;

    if (str.match(/^(\d{1,2})(\.)?$/)) {
      // Match '2', '2.', '22', '22.'.

      date = new Date();
      date.setDate(str);
      // If date in past: set it to next month.
      if (date < now) {
        date.setMonth(date.getMonth() + 1);
      }
    } else if ((matches = str.match(/^(\d{1,2})\.(\d{1,2})(\.)?$/))) {
      // Match '22.11' and '22.11.'
      const [, day, month] = matches;
      date = new Date();
      date.setMonth(month - 1, day);
      if (date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
    } else if ((matches = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})?$/))) {
      // Match '22.11.13'

      const [, day, month, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    } else if ((matches = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/))) {
      // Match '22.11.2013'
      const [, day, month, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    } else if ((matches = str.match(/^(\d{1,2})\/(\d{1,2})$/))) {
      // Match '11/22'.
      const [, month, day] = matches;
      date = new Date();
      date.setMonth(month - 1, day);
      if (date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
    } else if ((matches = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})?$/))) {
      // Match '11/22/13'
      const [, month, day, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    } else if ((matches = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})?$/))) {
      // Match '11/22/2013'
      const [, month, day, year] = matches;
      date = new Date(`${month}, ${day} ${year}`);
    } else if ((matches = str.match(/^(-|\+)(\d+)$/))) {
      // Match '+1' or '-2'
      const [, operator, offset] = matches;
      switch (operator) {
        case '+':
          date = new Date();
          date.setDate(date.getDate() + parseInt(offset));
          break;
        case '-':
          date = new Date();
          date.setDate(date.getDate() - parseInt(offset));
          break;
      }
    } else if ((matches = str.match(/^([A-Za-z\u00E0-\u00FC]+)$/))) {
      // Match 'Su', 'Mo', ...
      const maps = [];
      switch (locale.substr(0, 2)) {
        case 'cs':
          maps.push('ne po út st čt pá so');
          maps.push('ne po ut st ct pa so');
          break;
        case 'de':
          maps.push('so mo di mi do fr sa');
          break;
        case 'en':
          maps.push('u m t w r f s');
          maps.push('su mo tu we th fr sa');
          maps.push('sun mon tue wed thu fri sat');
          break;
        case 'es':
          maps.push('do lu ma mi ju vi sá');
          maps.push('do lu ma mi ju vi sa');
          break;
        case 'pl':
          maps.push('nd pn wt śr cz pt so');
          maps.push('nd pn wt sr cz pt so');
          break;
        case 'sk':
          maps.push('ne po ut st št pi so');
          break;
      }
      for (const map of maps) {
        const mapArray = map.split(' ');
        const desiredDayOfWeekIndex = mapArray.indexOf(str.toLowerCase());
        if (desiredDayOfWeekIndex > -1) {
          date = new Date();
          date.setDate(
            date.getDate() + desiredDayOfWeekIndex - date.getDay()
          );
          // If calculated day is in the past or today:
          // Set next week.
          if (date <= now) {
            date.setDate(date.getDate() + 7);
          }
          break;
        }
      }
    }

    return date;
  }
}
