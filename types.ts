
export interface ProductRecommendation {
  name: string;
  description: string;
  reason: string;
  howToOffer: string;
}

export interface SalesAnalysis {
  companyName: string;
  industry: string;
  summary: string;
  elevatorPitch: string;
  emailProposal: {
    subject: string;
    body: string;
  };
  googleProducts: ProductRecommendation[];
  servinformacionProducts: ProductRecommendation[];
}

export interface MXRecordInfo {
  providerName: string;
  isGoogleWorkspace: boolean;
  rawRecords: string[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING_DNS = 'ANALYZING_DNS',
  ANALYZING_AI = 'ANALYZING_AI',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface HistoryItem {
  domain: string;
  timestamp: number;
  mxInfo: MXRecordInfo;
  analysis: SalesAnalysis;
  focusAreas?: string[];
}
