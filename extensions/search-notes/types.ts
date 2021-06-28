// An array of string where every even item is a match that needs to be highlighted
// NOTE: it can have empty strings.
// for example ['aa', 'bb', 'cc'] , here 'bb' will be highlight in the search context
export type HighlightTextType = Array<string>;

export interface SearchResultItem {
  wsPath: string;
  matches: Array<{ parent: string; match: HighlightTextType }>;
}
