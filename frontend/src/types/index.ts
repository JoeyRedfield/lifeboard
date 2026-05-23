export interface OverviewData {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
  net: number;
}

export interface MonthlyTrendItem {
  year: number;
  month: number;
  income: number;
  expense: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
}

export interface AssetTrendItem {
  year: number;
  month: number;
  total_balance: number;
}

export interface SyncResult {
  success: boolean;
  result?: {
    accounts: number;
    categories: number;
    transactions: number;
  };
  error?: string;
}
