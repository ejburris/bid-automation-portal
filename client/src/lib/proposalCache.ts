/**
 * In-memory cache for recently generated proposals
 * Allows ProposalPreviewPage to use data from GenerateProposal mutation
 * without requiring an immediate refetch, improving performance.
 * 
 * Cache automatically expires after 5 minutes or on page reload.
 */

type CachedProposal = {
  bidId: number;
  proposal: any;
  costBreakdown: any;
  costItems: any;
  timestamp: number;
};

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
let cachedProposal: CachedProposal | null = null;

export function setCachedProposal(bidId: number, proposal: any, costBreakdown: any, costItems: any) {
  cachedProposal = {
    bidId,
    proposal,
    costBreakdown,
    costItems,
    timestamp: Date.now(),
  };
}

export function getCachedProposal(bidId: number): CachedProposal | null {
  if (!cachedProposal) return null;
  
  // Check if cache is still valid
  if (Date.now() - cachedProposal.timestamp > CACHE_EXPIRY_MS) {
    clearCache();
    return null;
  }
  
  // Check if this is the right bidId
  if (cachedProposal.bidId !== bidId) {
    return null;
  }
  
  return cachedProposal;
}

export function clearCache() {
  cachedProposal = null;
}
