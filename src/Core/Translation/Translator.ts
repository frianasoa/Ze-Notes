export interface Translator {
  translate(sentence: string, language: string): Promise<any>;
  translatewithkey?: (sentence: string, language: string, apikey:string|null) => Promise<void>;
  keyisvalid?:(apikey: string) => Promise<boolean>;
}