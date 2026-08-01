declare module "typo-js" {
  class Typo {
    constructor(locale: string);
    check(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): void;
  }
  export = Typo;
}
