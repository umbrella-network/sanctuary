import './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import * as workers from './workers';

const argv = yargs(process.argv.slice(2)).options({
  worker: { type: 'string', demandOption: true },
}).argv;

switch (argv.worker) {
  case 'ForeignChainSynchronizationWorker': {
    Application.get(workers.ForeignChainSynchronizationWorker).start();
    break;
  }

  case 'BlockSynchronizerWorker': {
    Application.get(workers.BlockSynchronizerWorker).start();
    break;
  }

  case 'BlockResolverWorker': {
    Application.get(workers.BlockResolverWorker).start();
    break;
  }

  case 'MetricsWorker': {
    Application.get(workers.MetricsWorker).start();
    break;
  }
}
