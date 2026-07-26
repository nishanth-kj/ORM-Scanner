export enum BranchCode {
  CS = "CS",
  EC = "EC",
  EE = "EE",
  ME = "ME",
  CE = "CE",
  IS = "IS"
}

export class BranchCodeHelper {
  static getCodes(): string[] {
    return Object.keys(BranchCode);
  }
  static getValues(): string[] {
    return Object.values(BranchCode);
  }
}

export enum PaperCode {
  PAPER_1 = 1,
  PAPER_2 = 2,
  PAPER_3 = 3,
  PAPER_4 = 4,
}

export class PaperCodeHelper {
  static getCodes(): string[] {
    return Object.keys(PaperCode).filter(k => isNaN(Number(k)));
  }
  static getValues(): number[] {
    return Object.values(PaperCode).filter(v => typeof v === "number") as number[];
  }
}
