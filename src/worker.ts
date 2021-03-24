require('newrelic');
import './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import BlockSynchronizerWorker from './workers/BlockSynchronizerWorker';

const argv = yargs(process.argv.slice(2)).options({
  worker: { type: 'string', demandOption: true },
}).argv;

switch (argv.worker) {
  case 'BlockSynchronizerWorker': {
    Application.get(BlockSynchronizerWorker).start();
    break;
  }
}
