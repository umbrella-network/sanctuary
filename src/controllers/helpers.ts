import { Request, Response } from 'express';
import { ILeaf } from '../models/Leaf';

export function replyWithLeaves(response: Response, leaves: ILeaf[]): void {
  if (response.locals.isAuthorized) {
    response.send(leaves);
    return;
  }

  response.send(
    leaves.map((leaf) => {
      leaf.proof = [];
      return leaf;
    })
  );
}

export function extractChainId(request: Request): string | undefined {
  return <string>(request.params.chainId || request.query.chainId);
}
