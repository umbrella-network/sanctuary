export class CreateBatchRanges {
  static apply(fromNumber: number, toNumber: number, batchSize: number): [number, number][] {
    if (fromNumber >= toNumber) {
      return [];
    }

    const ranges: [number, number][] = [];
    const count = Math.ceil((toNumber - fromNumber) / batchSize);

    for (let i = 0; i < count; i++) {
      const batchFrom = fromNumber + batchSize * i;
      const batchTo = Math.min(toNumber, batchFrom + batchSize - 1);
      ranges.push([batchFrom, batchTo]);
    }

    return ranges;
  }
}
