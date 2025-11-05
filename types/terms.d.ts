export interface FOSSGlossaryTerms {
  /**
   * Map of old slugs to current slugs for renamed or merged terms
   */
  redirects?: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^[a-z0-9]+(?:-[a-z0-9]+)*$".
     */
    [k: string]: string;
  };
  terms: {
    /**
     * Stable identifier for the glossary term
     */
    slug: string;
    /**
     * The FOSS term being defined
     */
    term: string;
    /**
     * Short, clear definition
     */
    definition: string;
    /**
     * Longer explanation if needed
     */
    explanation?: string;
    /**
     * Sarcastic or humorous take
     */
    humor?: string;
    /**
     * Related terms
     */
    see_also?: string[];
    /**
     * Categories (kebab-case: lowercase with hyphens)
     */
    tags?: string[];
    /**
     * Alternate labels for this term
     */
    aliases?: string[];
    /**
     * How controversial is this term?
     */
    controversy_level?: 'low' | 'medium' | 'high';
  }[];
}
