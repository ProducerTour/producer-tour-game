/**
 * OpenAI Service
 * Handles AI-powered features for contract analysis, document generation, and legal assistance
 */

import OpenAI from 'openai';

interface ContractAnalysisResult {
  summary: string;
  keyTerms: {
    term: string;
    explanation: string;
    concern: 'low' | 'medium' | 'high' | 'none';
  }[];
  redFlags: string[];
  recommendations: string[];
  plainEnglishSummary: string;
}

interface ContractGenerationParams {
  dealType: 'producer_agreement' | 'sync_license' | 'work_for_hire' | 'split_sheet' | 'beat_lease';
  clientName: string;
  clientPKA?: string;
  artistName: string;
  songTitle: string;
  labelName?: string;
  advance?: string;
  masterRoyalty?: string;
  publishingPercent?: string;
  soundExchangeLOD?: string;
  additionalTerms?: string;
}

interface LegalTermExplanation {
  term: string;
  definition: string;
  musicIndustryContext: string;
  example: string;
  watchOutFor: string;
}

interface QuestStepExplanation {
  summary: string;
  whyItMatters: string;
  taxImplications: string;
  legalConsiderations: string;
  commonMistakes: string[];
  proTips: string[];
  estimatedTime: string;
  estimatedCost?: string;
}

interface QuestStepContext {
  stepTitle: string;
  stepDescription: string;
  actionType: string;
  questTitle: string;
  questCategory: string;
  entityName: string;
  entityType: string;
  jurisdiction: string;
  actionData?: Record<string, unknown>;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private enabled: boolean;
  private model = 'gpt-4o'; // Best for complex reasoning

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.enabled = Boolean(apiKey);

    if (!this.enabled) {
      console.warn(
        'OpenAIService: OPENAI_API_KEY was not found. ' +
          'AI features (Legal AI, contract analysis) will be disabled until this environment variable is set.'
      );
    } else {
      this.client = new OpenAI({ apiKey });
      console.log('✅ OpenAI service initialized (Legal AI enabled)');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private assertEnabled(): void {
    if (!this.enabled || !this.client) {
      throw new Error('OpenAI integration is disabled. Set OPENAI_API_KEY to enable AI features.');
    }
  }

  /**
   * Analyze a music contract and extract key information
   */
  async analyzeContract(contractText: string): Promise<ContractAnalysisResult> {
    this.assertEnabled();

    const systemPrompt = `You are a music industry legal expert specializing in producer agreements, sync licenses, and publishing contracts. Analyze the provided contract and return a JSON response with the following structure:
{
  "summary": "A 2-3 sentence overview of what this contract does",
  "keyTerms": [
    {
      "term": "Term name (e.g., 'Advance', 'Royalty Rate', 'Term Length')",
      "explanation": "What this term means and the specific value in this contract",
      "concern": "low|medium|high|none - based on how favorable this is for the producer/artist"
    }
  ],
  "redFlags": ["List of concerning clauses or terms that need attention"],
  "recommendations": ["Specific suggestions for negotiation or changes"],
  "plainEnglishSummary": "A paragraph explaining what this contract means in simple terms a non-lawyer can understand"
}

Focus on music industry specifics like:
- Royalty rates and advances
- Publishing splits and ownership
- Master recording rights
- Sync license terms
- Credit and name usage
- Term length and options
- Territory and exclusivity
- Reversion clauses
- Audit rights
- Most favored nations clauses`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this music contract:\n\n${contractText}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content) as ContractAnalysisResult;
  }

  /**
   * Generate a music contract based on deal terms
   */
  async generateContract(params: ContractGenerationParams): Promise<string> {
    this.assertEnabled();

    const dealTypeNames: Record<ContractGenerationParams['dealType'], string> = {
      producer_agreement: 'Producer Agreement',
      sync_license: 'Synchronization License',
      work_for_hire: 'Work for Hire Agreement',
      split_sheet: 'Split Sheet / Collaboration Agreement',
      beat_lease: 'Beat Lease Agreement',
    };

    const systemPrompt = `You are a music industry legal expert. Generate a professional ${dealTypeNames[params.dealType]} contract.

The contract should:
1. Be written in clear, professional legal language
2. Include standard music industry protections for both parties
3. Be formatted with clear sections and numbered paragraphs
4. Include blanks [_____] where specific dates or signatures are needed
5. Be comprehensive but not overly complex

Focus on music industry standard terms and protections.`;

    const userPrompt = `Generate a ${dealTypeNames[params.dealType]} with these terms:

Client/Producer Name: ${params.clientName}
${params.clientPKA ? `Professionally Known As (p/k/a): ${params.clientPKA}` : ''}
Artist Name: ${params.artistName}
Song Title: "${params.songTitle}"
${params.labelName ? `Label: ${params.labelName}` : ''}
${params.advance ? `Advance: ${params.advance}` : ''}
${params.masterRoyalty ? `Master Royalty Rate: ${params.masterRoyalty}` : ''}
${params.publishingPercent ? `Publishing Percentage: ${params.publishingPercent}` : ''}
${params.soundExchangeLOD ? `SoundExchange Letter of Direction: ${params.soundExchangeLOD}` : ''}
${params.additionalTerms ? `Additional Terms: ${params.additionalTerms}` : ''}

Generate a complete, professional contract document.`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Explain legal terms in plain English with music industry context
   */
  async explainLegalTerms(terms: string[]): Promise<LegalTermExplanation[]> {
    this.assertEnabled();

    const systemPrompt = `You are a music industry legal expert who explains complex legal concepts in simple terms. For each term provided, return a JSON array with explanations:
[
  {
    "term": "The legal term",
    "definition": "Simple, plain-English definition",
    "musicIndustryContext": "How this term specifically applies in music contracts",
    "example": "A practical example of this term in action",
    "watchOutFor": "Common pitfalls or things to negotiate regarding this term"
  }
]`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Explain these music industry legal terms: ${terms.join(', ')}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.terms || parsed.explanations || [];
  }

  /**
   * Compare two versions of a contract and identify changes
   */
  async compareContracts(originalText: string, revisedText: string): Promise<{
    changes: { section: string; original: string; revised: string; significance: string }[];
    summary: string;
    recommendation: string;
  }> {
    this.assertEnabled();

    const systemPrompt = `You are a music industry legal expert specializing in contract redlines. Compare the original and revised contracts and identify all meaningful changes. Return a JSON response:
{
  "changes": [
    {
      "section": "Section or clause name",
      "original": "Original text or summary",
      "revised": "Revised text or summary",
      "significance": "Why this change matters and who it favors"
    }
  ],
  "summary": "Overall summary of the changes",
  "recommendation": "Advice on whether to accept these changes"
}`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Compare these two contract versions:\n\nORIGINAL:\n${originalText}\n\nREVISED:\n${revisedText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }

  /**
   * Chat with AI about legal/contract questions
   */
  async legalChat(
    message: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<string> {
    this.assertEnabled();

    const systemPrompt = `You are a helpful music industry legal assistant. You help producers, songwriters, and artists understand contracts, negotiate deals, and navigate the music business.

Important guidelines:
- Always clarify that you're providing general information, not legal advice
- Recommend consulting a music attorney for complex matters
- Be specific to the music industry (publishing, recording, sync, etc.)
- Explain concepts in plain English
- Be helpful and supportive

You can help with:
- Understanding contract terms
- Explaining royalty structures
- Discussing standard industry practices
- Suggesting negotiation strategies
- Clarifying rights and ownership`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Explain a quest step in context of music business formation
   * Used for the "Explain This" button on quest steps
   */
  async explainQuestStep(context: QuestStepContext): Promise<QuestStepExplanation> {
    this.assertEnabled();

    const systemPrompt = `You are a music industry business advisor specializing in corporate formation, publishing, and music business operations. You're helping a music producer understand the steps needed to properly structure their music business.

The user is setting up a music publishing and production company with a holding company structure:
- Producer Tour Holdings, Inc. (Delaware C-Corp) - Parent holding company
- Producer Tour IP, LLC (Delaware) - Intellectual property holding
- Producer Tour Publishing, LLC (Florida) - Music publishing operations
- Producer Tour Ops, LLC (Florida) - Day-to-day operations, employment
- Producer Tour Finance, LLC (Florida) - Treasury and financial management

You are explaining a specific quest step. Return a JSON response with:
{
  "summary": "A clear, 2-3 sentence explanation of what this step involves",
  "whyItMatters": "Why this step is important for a music business specifically",
  "taxImplications": "Any tax considerations (state franchise tax, federal, estimated taxes, etc.)",
  "legalConsiderations": "Key legal points, liability protection, compliance requirements",
  "commonMistakes": ["3-5 common mistakes people make on this step"],
  "proTips": ["3-5 insider tips from experienced music business professionals"],
  "estimatedTime": "Realistic time estimate (e.g., '30 minutes', '2-3 business days')",
  "estimatedCost": "Estimated costs if applicable (filing fees, professional fees, etc.)"
}

Be specific to the music industry. Reference relevant organizations like BMI, ASCAP, SESAC, SoundExchange, The MLC, Harry Fox Agency when applicable. Mention music-specific considerations like mechanical royalties, performance royalties, sync licensing, and master recording rights where relevant.`;

    const userPrompt = `Explain this quest step:

Entity: ${context.entityName} (${context.entityType})
Jurisdiction: ${context.jurisdiction}
Quest: ${context.questTitle} (Category: ${context.questCategory})

Step Title: ${context.stepTitle}
Step Description: ${context.stepDescription}
Action Type: ${context.actionType}
${context.actionData ? `Additional Context: ${JSON.stringify(context.actionData)}` : ''}

Provide a comprehensive explanation that helps a music producer understand exactly what they need to do and why.`;

    const response = await this.client!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content) as QuestStepExplanation;
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
