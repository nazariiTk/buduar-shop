import { create } from 'zustand';

const useAiMetricsStore = create((set) => ({
  metrics: {
    requestsLimit: null,
    requestsRemaining: null,
    requestsReset: null,
    tokensLimit: null,
    tokensRemaining: null,
    tokensReset: null,
  },
  updateMetrics: (newMetrics) => set((state) => ({
    metrics: { ...state.metrics, ...newMetrics }
  })),
}));

export default useAiMetricsStore;
