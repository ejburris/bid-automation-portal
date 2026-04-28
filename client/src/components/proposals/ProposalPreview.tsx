import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatUsd, type LockedPricingSnapshot } from '@/lib/pricingSnapshot';
import { formatAddendumDate, parseProposalAddenda } from '@/lib/addenda';
import { COMPANY_IDENTITY } from '@shared/companyIdentity';
import { DEFAULT_PROPOSAL_SCOPE_LANGUAGE } from '@shared/defaultProposalScope';

type ProposalPreviewProps = {
  bid: {
    projectName?: string | null;
    projectAddress?: string | null;
    clientCompany?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    addendaAcknowledged?: string | null;
    proposalScopeNotes?: string | null;
    createdAt?: Date | string | null;
    wageType?: 'private' | 'prevailing' | string | null;
  };
  snapshot: LockedPricingSnapshot;
  displayMode?: 'standard' | 'detailed';
  onDisplayModeChange?: (displayMode: 'standard' | 'detailed') => void;
};

function ScopeLine({ label, value, detail }: { label: string; value: number; detail?: string }) {
  if (value <= 0) return null;

  return (
    <div className="flex items-start justify-between gap-6 py-3 text-sm">
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        {detail && <div className="mt-1 text-xs text-gray-500">{detail}</div>}
      </div>
      <div className="font-semibold text-gray-900">{formatUsd(value)}</div>
    </div>
  );
}

function formatProposalDate(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString();
  return date.toLocaleDateString();
}

export function ProposalPreview({
  bid,
  snapshot,
  displayMode = 'standard',
  onDisplayModeChange,
}: ProposalPreviewProps) {
  const wageLabel = snapshot.wageType === 'private' ? 'Private' : 'Prevailing';
  const wageTypeLabel = (bid.wageType ?? snapshot.wageType) === 'prevailing' ? 'Prevailing Wage' : 'Private Wage';
  const hasClientInfo = Boolean(bid.clientCompany || bid.contactName || bid.phone || bid.email);
  const addenda = parseProposalAddenda(bid.addendaAcknowledged);
  const isDetailed = displayMode === 'detailed';
  const clientName = bid.clientCompany || bid.contactName || 'Client';
  const proposalDate = formatProposalDate(bid.createdAt);
  const scopeLanguage = bid.proposalScopeNotes ?? DEFAULT_PROPOSAL_SCOPE_LANGUAGE;

  return (
    <Card className="mx-auto max-w-4xl rounded-sm border-gray-300 bg-white shadow-sm print:border-0 print:shadow-none">
      <CardContent className="p-8 print:p-0">
        <header className="border-b border-gray-300 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Proposal</div>
              <h1 className="mt-2 text-3xl font-bold text-gray-950">{COMPANY_IDENTITY.name}</h1>
              <div className="mt-4 space-y-1 text-sm text-gray-800">
                <div><span className="font-semibold">Project:</span> {bid.projectName || 'Untitled Project'}</div>
                <div><span className="font-semibold">Client:</span> {clientName}</div>
                <div><span className="font-semibold">Date:</span> {proposalDate}</div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <div>{COMPANY_IDENTITY.phone} | {COMPANY_IDENTITY.tollFree}</div>
                <div>{COMPANY_IDENTITY.email}</div>
                <div>{COMPANY_IDENTITY.address}</div>
                <div>WA Contractor License: {COMPANY_IDENTITY.waContractorLicense}</div>
                <div>OMWBE Certification Number: {COMPANY_IDENTITY.omwbeCertificationNumber}</div>
              </div>
            </div>
            <Badge variant="outline" className="rounded-sm px-3 py-1 text-sm print:border-gray-400">
              {wageLabel} Wage
            </Badge>
          </div>
        </header>

        <section className="grid gap-6 border-b border-gray-200 py-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">Project</div>
            <h2 className="mt-2 text-xl font-semibold text-gray-950">{bid.projectName || 'Untitled Project'}</h2>
            <p className="mt-2 text-sm text-gray-700">{bid.projectAddress || 'No project address provided'}</p>
          </div>
          {hasClientInfo && (
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500">Client</div>
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                {bid.clientCompany && <div className="font-semibold text-gray-950">{bid.clientCompany}</div>}
                {bid.contactName && <div>{bid.contactName}</div>}
                {bid.phone && <div>{bid.phone}</div>}
                {bid.email && <div>{bid.email}</div>}
              </div>
            </div>
          )}
        </section>

        <section className="border-b border-gray-200 py-5">
          <div className="text-sm text-gray-800">
            <span className="font-semibold">Wage Type:</span> {wageTypeLabel}
          </div>
        </section>

        {addenda.length > 0 && (
          <section className="border-b border-gray-200 py-5">
            <h3 className="text-lg font-semibold text-gray-950">Addenda Acknowledged</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {addenda.map((addendum, index) => (
                <li key={`${addendum.name}-${index}`}>
                  {addendum.name}
                  {addendum.date ? ` — ${formatAddendumDate(addendum.date)}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border-b border-gray-200 py-6">
          <h3 className="text-lg font-semibold text-gray-950">Scope of Work</h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{scopeLanguage}</div>
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-950">{isDetailed ? 'Pricing Breakdown' : 'Pricing'}</h3>
            <div className="flex items-center gap-3">
              {isDetailed && (
                <div className="text-sm text-gray-500">{snapshot.base.projectSqft.toLocaleString()} sq ft</div>
              )}
              {onDisplayModeChange && (
                <div className="flex rounded-md border border-gray-300 bg-white p-1 print:hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant={!isDetailed ? 'default' : 'ghost'}
                    onClick={() => onDisplayModeChange('standard')}
                  >
                    Client View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isDetailed ? 'default' : 'ghost'}
                    onClick={() => onDisplayModeChange('detailed')}
                  >
                    Detailed View
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isDetailed && (
            <div className="mb-6 divide-y divide-gray-200 border-y border-gray-200">
              <ScopeLine label="Base Cleaning" value={snapshot.base.crewCost} />
              <ScopeLine label="Wax" value={snapshot.services.waxingCost} detail={`${snapshot.services.waxingSqft.toLocaleString()} sq ft`} />
              <ScopeLine label="Carpet" value={snapshot.services.carpetCost} detail={`${snapshot.services.carpetSqft.toLocaleString()} sq ft`} />
              <ScopeLine label="Windows" value={snapshot.services.windowCost} detail={`${snapshot.services.windowCount} windows`} />
              <ScopeLine label="Aerial Lift" value={snapshot.services.aerialLiftCost} />
              <ScopeLine label="Pressure Washing" value={snapshot.services.pressureWashingCost} />
              <ScopeLine label="Travel" value={snapshot.base.travelCost} detail={`${snapshot.base.travelDistance} mi`} />
            </div>
          )}

          <div className="flex items-center justify-between gap-6 rounded-sm bg-gray-100 px-5 py-5 print:border print:border-gray-300">
            <div>
              <div className="text-lg font-semibold text-gray-950">Final Cleaning Cost</div>
              <div className="mt-1 text-sm text-gray-600">Standard post-construction final clean</div>
            </div>
            <div className="text-3xl font-bold text-gray-950">{formatUsd(snapshot.totals.total)}</div>
          </div>
        </section>

        <section className="border-t border-gray-200 pt-5">
          <p className="text-sm leading-6 text-gray-700">
            Final Cleaning pricing is based on a standard post-construction clean. Any re-cleaning required due to ongoing work, material changes, or post-clean activities will be treated as additional service.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
