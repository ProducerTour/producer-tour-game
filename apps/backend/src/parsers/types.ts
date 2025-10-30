export interface ParsedSong {
  title: string;
  totalAmount: number;
  performances: number;
  occurrences: number;
  metadata: {
    source: string;
    titleVariations: string[];
    individualAmounts: number[];
    writers?: string[];
  };
}

export interface ParsedStatementItem {
  workTitle: string;
  revenue: number;
  performances: number;
  metadata: Record<string, any>;
}

export interface StatementParseResult {
  songs: Map<string, ParsedSong>;
  items: ParsedStatementItem[];
  totalRevenue: number;
  totalPerformances: number;
  songCount: number;
  warnings: string[];
  metadata: {
    pro: string;
    filename: string;
    parsedAt: string;
    rowCount: number;
  };
}

export interface CSVRow {
  [key: string]: string;
}
