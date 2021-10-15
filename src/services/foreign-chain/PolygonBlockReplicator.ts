import { injectable } from 'inversify';
import { ForeignBlockReplicator } from '.';
import { ChainsIds } from '../../types/ChainsIds';

@injectable()
export class PolygonBlockReplicator extends ForeignBlockReplicator {
  readonly chainId = ChainsIds.POLYGON;

  /*
    ────────────────────────────────────────────────────────────────────────────────
    ─██████──────────██████─██████████████─██████████████─██████████─██████████████─
    ─██░░██████████████░░██─██░░░░░░░░░░██─██░░░░░░░░░░██─██░░░░░░██─██░░░░░░░░░░██─
    ─██░░░░░░░░░░░░░░░░░░██─██░░██████░░██─██░░██████████─████░░████─██░░██████████─
    ─██░░██████░░██████░░██─██░░██──██░░██─██░░██───────────██░░██───██░░██─────────
    ─██░░██──██░░██──██░░██─██░░██████░░██─██░░██───────────██░░██───██░░██─────────
    ─██░░██──██░░██──██░░██─██░░░░░░░░░░██─██░░██──██████───██░░██───██░░██─────────
    ─██░░██──██████──██░░██─██░░██████░░██─██░░██──██░░██───██░░██───██░░██─────────
    ─██░░██──────────██░░██─██░░██──██░░██─██░░██──██░░██───██░░██───██░░██─────────
    ─██░░██──────────██░░██─██░░██──██░░██─██░░██████░░██─████░░████─██░░██████████─
    ─██░░██──────────██░░██─██░░██──██░░██─██░░░░░░░░░░██─██░░░░░░██─██░░░░░░░░░░██─
    ─██████──────────██████─██████──██████─██████████████─██████████─██████████████─
    ────────────────────────────────────────────────────────────────────────────────
   */
}