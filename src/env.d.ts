/// <reference types="vite/client" />

interface Window {
  bills?: Array<Record<string, any>>;
  supabase?: any;
  editBillGlobal?: (billId: string) => void;
  getTotalPaid?: (bill: Record<string, any>) => number;
  getRemainingBalance?: (bill: Record<string, any>) => number;
  recordPayment?: (billId: string, paymentData: Record<string, any>) => void;
  tryRecoverFromStaleServiceWorker?: (reason?: string) => Promise<void>;
}
