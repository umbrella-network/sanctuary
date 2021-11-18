import './boot';
import yargs from 'yargs';
import { EventEmitter } from 'events';
import { getContainer } from './lib/getContainer';
import { LocalUserAuth0Synchronizer } from './services/LocalUserAuth0Synchronizer';

const argv = yargs(process.argv.slice(2)).options({
  task: { type: 'string', demandOption: true },
}).argv;

const ev = new EventEmitter();
ev.on('done', () => process.exit());

(async () => {
  const container = getContainer();

  switch (argv.task) {
    case 'auth0:import': {
      await container.get(LocalUserAuth0Synchronizer).apply();
      ev.emit('done');
      break;
    }
  }
})();
