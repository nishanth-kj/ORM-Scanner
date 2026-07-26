export enum Status {
  INACTIVE = 0,
  ACTIVE = 1,
}

export class StatusHelper {
  static getCodes(): string[] {
    return Object.keys(Status).filter(k => isNaN(Number(k)));
  }
  static getValues(): number[] {
    return Object.values(Status).filter(v => typeof v === "number") as number[];
  }
}
