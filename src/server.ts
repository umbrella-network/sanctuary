import './boot';
import Application from './lib/Application';
import Server from './lib/Server';
import initInfluxDB from './config/initInfluxDB';
import settings from './config/settings';

initInfluxDB(settings);
Application.get(Server).start();
