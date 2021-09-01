import './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import { BlockResolverWorker, BlockSynchronizerWorker, ForeignChainReplicationWorker, MetricsWorker } from './workers';

const argv = yargs(process.argv.slice(2)).options({
  worker: { type: 'string', demandOption: true },
}).argv;

switch (argv.worker) {
  case 'ForeignChainReplicationWorker': {
    Application.get(ForeignChainReplicationWorker).start();
    break;
  }

  case 'BlockSynchronizerWorker': {
    Application.get(BlockSynchronizerWorker).start();
    break;
  }

  case 'BlockResolverWorker': {
    Application.get(BlockResolverWorker).start();
    break;
  }

  case 'MetricsWorker': {
    Application.get(MetricsWorker).start();
    break;
  }
}
