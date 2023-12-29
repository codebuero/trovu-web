/** @module Env */

/** Set and remember the environment. */

export default class Logger {
  /**
   * Set helper variables.
   */
  constructor(logElementSelector, debug = false) {
    this.logs = [];
    if (!(typeof document === 'undefined')) {
      this.logElement = document.querySelector(logElementSelector);
    }
    
    if (debug) {
      this.showLog();
    }
  }

  log(level, message) {
    this.logs.push({
      level,
      message
    });
    if (this.logElement) {
      this.logElement.textContent += `${message}\n`;
    }
  }

  info(message) {
    this.log('info', JSON.stringify(message, null, 2));
  }

  warning(message) {
    this.log('warning', JSON.stringify(message, null, 2));
  }

  success(message) {
    this.log('success', JSON.stringify(message, null, 2));
  }

  error(message) {
    this.log('error', message);
    this.showLog();
    throw new Error(message);
  }

  showLog() {
    if (this.logElement) {
      this.logElement.removeAttribute('hidden');
    }
  }
}
