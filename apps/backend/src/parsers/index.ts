import { BMIParser } from './bmi.parser';
import { ASCAPParser } from './ascap.parser';
import { MLCParser } from './mlc.parser';
import { StatementParseResult } from './types';

export type ProType = 'BMI' | 'ASCAP' | 'SESAC' | 'MLC' | 'OTHER';

/**
 * Parser Factory - Returns appropriate parser for PRO type
 */
export class StatementParserFactory {
  static getParser(proType: ProType) {
    switch (proType) {
      case 'BMI':
        return new BMIParser();
      case 'ASCAP':
        return new ASCAPParser();
      case 'SESAC':
        // SESAC uses similar format to ASCAP for now
        return new ASCAPParser();
      case 'MLC':
        return new MLCParser();
      default:
        throw new Error(`Unsupported PRO type: ${proType}`);
    }
  }

  static async parse(
    proType: ProType,
    csvContent: string,
    filename: string
  ): Promise<StatementParseResult> {
    const parser = this.getParser(proType);
    return parser.parse(csvContent, filename);
  }
}

// Export all parsers and types
export { BMIParser } from './bmi.parser';
export { ASCAPParser } from './ascap.parser';
export { MLCParser } from './mlc.parser';
export * from './types';
export * from './utils';
