declare module "snowball-stemmers" {
  export interface Stemmer {
    stem(palabra: string): string;
  }
  export function newStemmer(idioma: string): Stemmer;
  export function algorithms(): string[];
  const defecto: { newStemmer: typeof newStemmer; algorithms: typeof algorithms };
  export default defecto;
}
