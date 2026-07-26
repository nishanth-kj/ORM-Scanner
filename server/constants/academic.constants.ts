export enum BranchCode {
  CIVIL = "Civil Engineering",
  COMPUTER = "Computer Stream",
  MECHANICAL = "Mechanical Stream",
  ELECTRICAL = "Electrical Stream"
}

export class BranchCodeHelper {
  static getCodes(): string[] {
    return Object.keys(BranchCode);
  }
  static getValues(): string[] {
    return Object.values(BranchCode);
  }
}

export const BookletVersions = [
  "A1", "A2", "A3", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D1", "D2", "D3", "D4"
] as const;

export class BookletVersionHelper {
  static getValues(): string[] {
    return [...BookletVersions];
  }
}
