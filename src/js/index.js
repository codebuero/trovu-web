import Home from './modules/Home';
import Logger from './modules/Logger';

const logger = new Logger('#log', (new URLSearchParams(window.location.has).get('debug') ?? false));
const home = new Home(logger);
document.querySelector('body').onload = home.initialize();
