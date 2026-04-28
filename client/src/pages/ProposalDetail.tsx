import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { buildProposalEmailDraftHref } from '@/lib/proposalMail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, MapPin, Building2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LockedPricingReviewCard } from '@/components/bids/LockedPricingReviewCard';
import { buildLockedSnapshotFromBid } from '@/lib/pricingSnapshot';
import { ProjectFilesSection } from '@/components/bids/ProjectFilesSection';

export default function ProposalDetail() {
  const { bidId } = useParams<{ bidId: string }>();
  const [, navigate] = useLocation();
  const [wageType, setWageType] = useState<'private' | 'prevailing'>('private');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bidIdNum = bidId ? parseInt(bidId) : 0;
  const utils = trpc.useUtils();

  // Fetch proposal data
  const { data: proposal, isLoading: isLoadingProposal, error: proposalError } = trpc.proposals.getByBidId.useQuery(
    { bidId: bidIdNum },
    { enabled: !!bidIdNum }
  );

  // tRPC mutations
  const updateWageTypeMutation = trpc.proposals.updateWageType.useMutation();
  const approveMutation = trpc.proposals.approve.useMutation();
  const rejectMutation = trpc.proposals.reject.useMutation();
  const submitMutation = trpc.proposals.submit.useMutation();
  const markSentMutation = trpc.bids.markSent.useMutation();
  const [isOpeningProposalDraft, setIsOpeningProposalDraft] = useState(false);

  useEffect(() => {
    if (proposal?.bid) {
      const wageType = proposal.bid.isPrivateWage ? 'private' : 'prevailing';
      setWageType(wageType as 'private' | 'prevailing');
    }
  }, [proposal]);

  const handleWageTypeChange = async (newWageType: 'private' | 'prevailing') => {
    try {
      setWageType(newWageType);
      await updateWageTypeMutation.mutateAsync({
        bidId: bidIdNum,
        wageType: newWageType,
      });
      toast.success('Wage type updated');
    } catch (error) {
      toast.error('Failed to update wage type');
      const wageType = proposal?.bid.isPrivateWage ? 'private' : 'prevailing';
      setWageType(wageType as 'private' | 'prevailing');
    }
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await approveMutation.mutateAsync({
        bidId: bidIdNum,
        approvalNotes,
      });
      toast.success('Proposal approved');
      setTimeout(() => navigate('/bids'), 1500);
    } catch (error) {
      toast.error('Failed to approve proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setIsSubmitting(true);
      await rejectMutation.mutateAsync({
        bidId: bidIdNum,
        rejectionReason,
      });
      toast.success('Proposal rejected');
      setTimeout(() => navigate('/bids'), 1500);
    } catch (error) {
      toast.error('Failed to reject proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await submitMutation.mutateAsync({ bidId: bidIdNum });
      toast.success('Proposal submitted successfully');
      setTimeout(() => navigate('/bids'), 1500);
    } catch (error) {
      toast.error('Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProposalEmailDraft = async () => {
    if (!proposal?.bid) {
      toast.error('Proposal data is unavailable');
      return;
    }

    try {
      setIsOpeningProposalDraft(true);
      await markSentMutation.mutateAsync({ id: proposal.bid.id });
      await Promise.all([
        utils.dashboard.getOverview.invalidate(),
        utils.bids.list.invalidate(),
        utils.proposals.getByBidId.invalidate({ bidId: proposal.bid.id }),
      ]);
      window.location.href = buildProposalEmailDraftHref(proposal.bid);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open proposal email draft');
    } finally {
      setIsOpeningProposalDraft(false);
    }
  };

  if (isLoadingProposal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (proposalError || !proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading Proposal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {proposalError?.message || 'Failed to load proposal details'}
            </p>
            <Button onClick={() => navigate('/bids')} className="mt-4 w-full">
              Back to Bids
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bid = proposal.bid;
  const project = proposal.project;
  const isApproved = bid.status === 'awarded';
  const lockedSnapshot = buildLockedSnapshotFromBid(bid);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.projectName}</h1>
              <p className="text-gray-600 flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4" />
                {project.location}
              </p>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  bid.status === 'awarded'
                    ? 'default'
                    : bid.status === 'sent'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Square Footage</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {project.squareFootage?.toLocaleString()} sq ft
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="text-lg font-semibold">
                  {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Jurisdiction</p>
                <p className="text-lg font-semibold">{project.jurisdiction || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="text-lg font-semibold">{project.contactName || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wage Type Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Wage Rate Selection</CardTitle>
            <CardDescription>Choose between private or prevailing wage rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Wage Type</label>
                <Select value={wageType} onValueChange={(value) => handleWageTypeChange(value as 'private' | 'prevailing')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private Wage ($39.44/hr)</SelectItem>
                    <SelectItem value="prevailing">Prevailing Wage (by jurisdiction)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                {wageType === 'private' ? (
                  <p>Base rate: $39.44/hr (includes 1.255× office multiplier, 0.7 profit margin)</p>
                ) : (
                  <p>Rate varies by jurisdiction and effective date</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <LockedPricingReviewCard
            snapshot={lockedSnapshot}
            title="Proposal Pricing Snapshot"
            description="This proposal is now reading the same shared pricing-style snapshot used across the bid backbone."
          />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
            <CardDescription>Internal bid notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{bid.notes || 'No internal notes saved.'}</p>
          </CardContent>
        </Card>

        <div className="mb-6">
          <ProjectFilesSection bidId={bid.id} />
        </div>

        {/* Action Buttons */}
        {!isApproved && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Proposal Actions</CardTitle>
              <CardDescription>Approve or reject this proposal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleOpenProposalEmailDraft}
                  variant="outline"
                  disabled={isSubmitting || isOpeningProposalDraft}
                  className="flex-1"
                >
                  {isOpeningProposalDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening draft...
                    </>
                  ) : (
                    'Open Proposal Email Draft'
                  )}
                </Button>

                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Proposal
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowRejectionForm(!showRejectionForm)}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              {/* Rejection Form */}
              {showRejectionForm && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <label className="text-sm font-medium mb-2 block text-red-900">Rejection Reason</label>
                  <Textarea
                    placeholder="Explain why this proposal is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-20 mb-3"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        'Confirm Rejection'
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowRejectionForm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submission Section */}
        {isApproved && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Ready to Submit
              </CardTitle>
              <CardDescription className="text-green-800">
                This proposal has been approved and is ready for submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Proposal'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <Button onClick={() => navigate('/bids')} variant="outline" className="w-full">
          Back to Bids
        </Button>
      </div>
    </div>
  );
}

