import Home from './modules/Home';
import Logger from './modules/Logger';

const logger = new Logger('#log');
const home = new Home(logger);
document.querySelector('body').onload = home.initialize();
