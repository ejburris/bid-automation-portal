'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ServicesConfigModal, type ServicesConfig } from '@/components/ServicesConfigModal';
import { LockedPricingReviewCard } from '@/components/bids/LockedPricingReviewCard';
import { formatUsd } from '@/lib/pricingSnapshot';
import { getPricingDefaults, type BidInput, type WageType } from '@/lib/sharedBidPricing';
import {
  DEFAULT_REALITY_ESTIMATION_CONFIG,
  calculateRealityEstimation,
  formatRealityNumber,
  type RealityEstimationConfig,
} from '@/lib/realityEstimation';
import { VANCOUVER_WA_HOME_BASE, calculateDistance } from '@/lib/distanceCalculation';
import { calculateTravelDecision } from '@/lib/travelDecision';
import { DEFAULT_PROPOSAL_SCOPE_LANGUAGE } from '@shared/defaultProposalScope';
import { Calculator, ClipboardList, Loader2, Plus, Settings, Trash2, Truck, Users } from 'lucide-react';

type AddendumInput = { name: string; date: string };

export default function NewBid() {
  const { data: user } = trpc.auth.me.useQuery();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const createBidMutation = trpc.bids.create.useMutation();
  const { data: savedClients = [] } = trpc.clients.list.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const [projectName, setProjectName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [proposalScopeNotes, setProposalScopeNotes] = useState(DEFAULT_PROPOSAL_SCOPE_LANGUAGE);
  const [clientCompany, setClientCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [clientOfficePhone, setClientOfficePhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [addendaAcknowledged, setAddendaAcknowledged] = useState<AddendumInput[]>([{ name: '', date: '' }]);
  const [projectSqft, setProjectSqft] = useState('');
  const [crewDays, setCrewDays] = useState('1');
  const [crewPeople, setCrewPeople] = useState('1');
  const [isPrivateWage, setIsPrivateWage] = useState(true);
  const wageType: WageType = isPrivateWage ? 'private' : 'prevailing';
  const pricingDefaults = useMemo(() => getPricingDefaults(wageType), [wageType]);
  const [realityConfig, setRealityConfig] = useState<RealityEstimationConfig>(DEFAULT_REALITY_ESTIMATION_CONFIG);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [servicesConfig, setServicesConfig] = useState<ServicesConfig>({
    waxingSqft: 0,
    carpetSqft: 0,
    windowCount: 0,
    floorCount: 1,
    windowsByFloor: [{ floor: 1, count: 0 }],
    exteriorWindows: true,
    aerialLiftEnabled: false,
    aerialLiftCost: pricingDefaults.lift,
    pressureWashingCost: pricingDefaults.pressure,
    pressureWashingEnabled: false,
  });

  const [manualLockedPriceOverride, setManualLockedPriceOverride] = useState<number | ''>('');

  const projectAddressForDistance = useMemo(
    () => [address, city, state].map(value => value.trim()).filter(Boolean).join(', '),
    [address, city, state],
  );
  const distanceCalculation = useMemo(
    () => calculateDistance(VANCOUVER_WA_HOME_BASE, projectAddressForDistance),
    [projectAddressForDistance],
  );
  const calculatedDistance = distanceCalculation.distance ?? 0;

  useEffect(() => {
    setServicesConfig((current) => ({
      ...current,
      aerialLiftCost: current.aerialLiftCost || pricingDefaults.lift,
      pressureWashingCost: pricingDefaults.pressure,
    }));
  }, [pricingDefaults.lift, pricingDefaults.pressure]);

  const bidInput = useMemo<BidInput>(() => ({
    sqft: Number(projectSqft) || 0,
    waxSqft: servicesConfig.waxingSqft || 0,
    carpetSqft: servicesConfig.carpetSqft || 0,
    windowCount: servicesConfig.windowCount || 0,
    windowFloor: servicesConfig.floorCount || 1,
    exteriorWindows: servicesConfig.exteriorWindows ?? true,
    useLift: servicesConfig.aerialLiftEnabled === true,
    liftCost: servicesConfig.aerialLiftCost || pricingDefaults.lift,
    usePressure: servicesConfig.pressureWashingEnabled === true,
    pressureCost: servicesConfig.pressureWashingCost || pricingDefaults.pressure,
    wageType,
  }), [projectSqft, servicesConfig, pricingDefaults.lift, pricingDefaults.pressure, wageType]);

  const pricingInput = useMemo(() => ({
    ...bidInput,
    crewDays: Number(crewDays) || 1,
    crewPeople: Number(crewPeople) || 1,
    travelDistance: calculatedDistance,
    floorCount: servicesConfig.floorCount || 1,
    manualOverride: manualLockedPriceOverride === '' ? null : Number(manualLockedPriceOverride),
  }), [bidInput, crewDays, crewPeople, calculatedDistance, servicesConfig.floorCount, manualLockedPriceOverride]);

  const { data: pricingSnapshot, isFetching: pricingLoading } = trpc.pricing.calculateLockedBid.useQuery(pricingInput, {
    enabled: Boolean(user) && (Number(projectSqft) > 0 || servicesConfig.windowCount > 0 || servicesConfig.waxingSqft > 0 || servicesConfig.carpetSqft > 0),
  });
  const realityEstimation = useMemo(
    () => pricingSnapshot ? calculateRealityEstimation(pricingSnapshot, realityConfig) : null,
    [pricingSnapshot, realityConfig],
  );
  const travelDecision = useMemo(
    () => calculateTravelDecision({
      distance: distanceCalculation.distance,
      distanceStatus: distanceCalculation.distanceStatus,
      workersNeeded: realityEstimation?.workersNeeded ?? 1,
      desiredProjectDays: realityEstimation?.desiredProjectDays ?? realityConfig.desiredProjectDays,
    }),
    [distanceCalculation, realityEstimation, realityConfig.desiredProjectDays],
  );
  const matchingClients = useMemo(() => {
    const query = clientCompany.trim().toLowerCase();
    if (query.length < 2) return [];
    return savedClients
      .filter((client) => client.clientCompany.toLowerCase().includes(query))
      .slice(0, 5);
  }, [clientCompany, savedClients]);

  const fillFromClient = (client: (typeof savedClients)[number]) => {
    setClientCompany(client.clientCompany ?? '');
    setContactName(client.contactName ?? '');
    setPhone(client.phone ?? '');
    setEmail(client.email ?? '');
    setClientOfficePhone(client.officePhone ?? '');
    setClientAddress(client.address ?? '');
    setClientCity(client.city ?? '');
    setClientState(client.state ?? '');
    setClientNotes(client.notes ?? '');
  };

  const handleCreateBid = async () => {
    if (!user?.id) {
      toast.error('You must be signed in.');
      return;
    }
    if (!projectName.trim() || !(Number(projectSqft) > 0)) {
      toast.error('Please complete the project name and square footage.');
      return;
    }

    try {
      const result = await createBidMutation.mutateAsync({
        projectName: projectName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        projectNotes: projectNotes.trim(),
        proposalScopeNotes,
        clientCompany: clientCompany.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        clientOfficePhone: clientOfficePhone.trim(),
        clientAddress: clientAddress.trim(),
        clientCity: clientCity.trim(),
        clientState: clientState.trim().toUpperCase(),
        clientNotes: clientNotes.trim(),
        addendaAcknowledged: addendaAcknowledged
          .map((item) => ({ name: item.name.trim(), date: item.date }))
          .filter((item) => item.name),
        projectSqft: Number(projectSqft),
        crewDays: Number(crewDays) || 1,
        crewPeople: Number(crewPeople) || 1,
        travelDistance: calculatedDistance,
        isPrivateWage,
        travelCost: pricingSnapshot?.base.travelCost ?? 0,
        includeWaxing: servicesConfig.waxingSqft > 0,
        includeCarpet: servicesConfig.carpetSqft > 0,
        includeWindows: servicesConfig.windowCount > 0,
        waxingSqft: servicesConfig.waxingSqft,
        carpetSqft: servicesConfig.carpetSqft,
        windowCount: servicesConfig.windowCount,
        floorCount: servicesConfig.floorCount,
        exteriorWindows: servicesConfig.exteriorWindows ?? true,
        aerialLiftEnabled: servicesConfig.aerialLiftEnabled === true,
        aerialLiftCost: servicesConfig.aerialLiftCost || pricingDefaults.lift,
        pressureWashingEnabled: servicesConfig.pressureWashingEnabled === true,
        pressureWashingCost: servicesConfig.pressureWashingCost || pricingDefaults.pressure,
        userId: user.id,
      });
      await Promise.all([
        utils.bids.list.invalidate(),
        utils.clients.list.invalidate(),
        utils.dashboard.getOverview.invalidate(),
      ]);
      toast.success('Bid created successfully.');
      setProjectName('');
      setAddress('');
      setCity('');
      setState('');
      setProjectNotes('');
      setProposalScopeNotes(DEFAULT_PROPOSAL_SCOPE_LANGUAGE);
      setClientCompany('');
      setContactName('');
      setPhone('');
      setEmail('');
      setClientOfficePhone('');
      setClientAddress('');
      setClientCity('');
      setClientState('');
      setClientNotes('');
      setAddendaAcknowledged([{ name: '', date: '' }]);
      setProjectSqft('');
      setCrewDays('1');
      setCrewPeople('1');
      setIsPrivateWage(true);
      setRealityConfig(DEFAULT_REALITY_ESTIMATION_CONFIG);
      setServicesConfig({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 0,
        floorCount: 1,
        windowsByFloor: [{ floor: 1, count: 0 }],
        exteriorWindows: true,
        aerialLiftEnabled: false,
        aerialLiftCost: pricingDefaults.lift,
        pressureWashingCost: pricingDefaults.pressure,
        pressureWashingEnabled: false,
      });
      navigate(result.bidId ? `/proposal-view/${result.bidId}` : '/bids');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create bid');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Bid</h1>
        <p className="mt-2 text-gray-600">Build the bid from the shared backbone. Pricing preview and saved bid use the same server calculation.</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Client Information</CardTitle>
              <CardDescription>Optional contact details for the bid recipient.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientCompany">Client Company</Label>
                <Input id="clientCompany" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="General Contractor Inc." autoComplete="off" />
                {matchingClients.length > 0 && (
                  <div className="rounded-md border bg-background shadow-sm">
                    {matchingClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => fillFromClient(client)}
                      >
                        <span className="font-medium">{client.clientCompany}</span>
                        {(client.contactName || client.email) && (
                          <span className="ml-2 text-muted-foreground">
                            {[client.contactName, client.email].filter(Boolean).join(' - ')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Project Manager" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="360.555.0123" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pm@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientOfficePhone">Office Phone</Label>
                <Input id="clientOfficePhone" value={clientOfficePhone} onChange={(e) => setClientOfficePhone(e.target.value)} placeholder="360.555.0100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientState">Client State</Label>
                <Input id="clientState" value={clientState} onChange={(e) => setClientState(e.target.value)} placeholder="WA" maxLength={2} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientAddress">Client Address</Label>
                <Input id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Client office address" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientCity">Client City</Label>
                <Input id="clientCity" value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="Vancouver" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientNotes">Client Notes</Label>
                <Textarea id="clientNotes" value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="Reusable client notes" rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Project Information</CardTitle>
              <CardDescription>Project name is required before the bid can be saved.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Pearl Storage - Final Clean" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Project Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Springfield" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="OR" maxLength={2} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                <div>
                  <div className="font-medium">Wage Type</div>
                  <div className="text-sm text-muted-foreground">Feeds the locked pricing engine and estimator defaults.</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={!isPrivateWage ? 'text-muted-foreground' : 'font-medium'}>Private</span>
                  <Switch checked={!isPrivateWage} onCheckedChange={(checked) => setIsPrivateWage(!checked)} />
                  <span className={isPrivateWage ? 'text-muted-foreground' : 'font-medium'}>Prevailing</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Addenda Acknowledged</CardTitle>
              <CardDescription>List addenda to show on the client-facing proposal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {addendaAcknowledged.map((addendum, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
                  <Input
                    value={addendum.name}
                    onChange={(event) => {
                      const next = [...addendaAcknowledged];
                      next[index] = { ...next[index], name: event.target.value };
                      setAddendaAcknowledged(next);
                    }}
                    placeholder={`Addendum #${index + 1}`}
                  />
                  <Input
                    type="date"
                    value={addendum.date}
                    onChange={(event) => {
                      const next = [...addendaAcknowledged];
                      next[index] = { ...next[index], date: event.target.value };
                      setAddendaAcknowledged(next);
                    }}
                    aria-label={`Addendum #${index + 1} date`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setAddendaAcknowledged(addendaAcknowledged.length === 1 ? [{ name: '', date: '' }] : addendaAcknowledged.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label="Remove addendum"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setAddendaAcknowledged([...addendaAcknowledged, { name: '', date: '' }])}>
                <Plus className="mr-2 h-4 w-4" />
                Add Addendum
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proposal Scope Notes</CardTitle>
              <CardDescription>Edit the client-facing scope language for this bid before saving.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="proposalScopeNotes">Scope Language</Label>
              <Textarea
                id="proposalScopeNotes"
                className="mt-2 min-h-40"
                value={proposalScopeNotes}
                onChange={(event) => setProposalScopeNotes(event.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Internal project notes. These are not included in the client proposal PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="projectNotes"
                value={projectNotes}
                onChange={(event) => setProjectNotes(event.target.value)}
                placeholder="Internal notes about scope, site conditions, GC preferences, or bid assumptions."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Scope Inputs</CardTitle>
              <CardDescription>Scope drives both the locked price and the separate crew reality estimate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="projectSqft">Square Footage</Label>
                  <Input id="projectSqft" type="number" min="0" value={projectSqft} onChange={(e) => setProjectSqft(e.target.value)} placeholder="25000" />
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Calculated Distance</div>
                  <div className="mt-1 font-semibold">{distanceCalculation.distanceStatus === 'Known' ? `${distanceCalculation.distance} mi` : distanceCalculation.distanceStatus}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {distanceCalculation.matchedLocationName ? `Matched ${distanceCalculation.matchedLocationName}` : `From ${VANCOUVER_WA_HOME_BASE.name}`}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">Additional Services</div>
                    <div className="text-sm text-muted-foreground">Waxing, carpet, windows, pressure washing, and lift scope count toward reality planning.</div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setShowServicesModal(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Services
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div className="rounded-md bg-muted/40 p-3"><div className="text-muted-foreground">Waxing Sqft</div><div className="font-medium">{servicesConfig.waxingSqft.toLocaleString()}</div></div>
                  <div className="rounded-md bg-muted/40 p-3"><div className="text-muted-foreground">Carpet Sqft</div><div className="font-medium">{servicesConfig.carpetSqft.toLocaleString()}</div></div>
                  <div className="rounded-md bg-muted/40 p-3"><div className="text-muted-foreground">Windows</div><div className="font-medium">{servicesConfig.windowCount}</div></div>
                  <div className="rounded-md bg-muted/40 p-3"><div className="text-muted-foreground">Floors</div><div className="font-medium">{servicesConfig.floorCount}</div></div>
                  <div className="rounded-md bg-muted/40 p-3"><div className="text-muted-foreground">Pressure Washing</div><div className="font-medium">{servicesConfig.pressureWashingEnabled ? formatUsd(servicesConfig.pressureWashingCost || 0) : 'Off'}</div></div>
                  <div className="rounded-md bg-muted/40 p-3"><div className="text-muted-foreground">Aerial Lift</div><div className="font-medium">{servicesConfig.aerialLiftEnabled ? formatUsd(pricingSnapshot?.services.aerialLiftCost ?? 0) : 'Off'}</div></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> 4. Reality Estimation</CardTitle>
              <CardDescription>Uses base cleaning plus add-on costs for labor-equivalent planning only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {realityEstimation ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Base Cleaning Cost</div><div className="mt-1 font-semibold">{formatUsd(realityEstimation.baseCleaningCost)}</div></div>
                    <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Add-on Costs</div><div className="mt-1 font-semibold">{formatUsd(realityEstimation.addOnCosts)}</div></div>
                    <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Labor-Equivalent Cost</div><div className="mt-1 font-semibold">{formatUsd(realityEstimation.totalLaborEquivalentCost)}</div></div>
                    <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Total Labor Hours</div><div className="mt-1 font-semibold">{formatRealityNumber(realityEstimation.totalLaborHours)} hrs</div></div>
                    <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Worker-Days</div><div className="mt-1 font-semibold">{formatRealityNumber(realityEstimation.totalWorkerDays)}</div></div>
                    <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Workers Needed</div><div className="mt-1 font-semibold">{realityEstimation.workersNeeded}</div></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="realityCostPerManHour">Cost Per Man Hour</Label>
                      <Input
                        id="realityCostPerManHour"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={isPrivateWage ? realityConfig.privateCostPerManHour : realityConfig.prevailingCostPerManHour}
                        onChange={(event) => setRealityConfig({
                          ...realityConfig,
                          [isPrivateWage ? 'privateCostPerManHour' : 'prevailingCostPerManHour']: Number(event.target.value),
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workDayHours">Work Day Hours</Label>
                      <Input id="workDayHours" type="number" min="0.5" step="0.5" value={realityConfig.workDayHours} onChange={(event) => setRealityConfig({ ...realityConfig, workDayHours: Number(event.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desiredProjectDays">Desired Project Days</Label>
                      <Input id="desiredProjectDays" type="number" min="0.5" step="0.5" value={realityConfig.desiredProjectDays} onChange={(event) => setRealityConfig({ ...realityConfig, desiredProjectDays: Number(event.target.value) })} />
                    </div>
                  </div>
                </>
              ) : (
                <Alert>
                  <Calculator className="h-4 w-4" />
                  <AlertDescription>Enter square footage or service scope to calculate reality estimation.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> 5. Crew Plan</CardTitle>
              <CardDescription>Suggested staffing derived from the reality estimate. Manual override can be added later.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Suggested Workers</div><div className="mt-1 text-xl font-semibold">{realityEstimation?.workersNeeded ?? '-'}</div></div>
              <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Suggested Days</div><div className="mt-1 text-xl font-semibold">{realityEstimation ? formatRealityNumber(realityEstimation.desiredProjectDays) : '-'}</div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> 6. Travel Review</CardTitle>
              <CardDescription>Temporary travel decision logic uses Vancouver, WA as the fixed home base.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Home Base</div><div className="mt-1 font-semibold">{travelDecision.homeBase}</div></div>
                <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Distance</div><div className="mt-1 font-semibold">{travelDecision.distanceStatus === 'Known' ? `${travelDecision.distance} mi` : travelDecision.distanceStatus}</div></div>
                <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Travel Status</div><div className="mt-1 font-semibold">{travelDecision.travelStatus}</div></div>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <div className="text-muted-foreground">Project Address Used</div>
                <div className="mt-1 font-medium">{projectAddressForDistance || 'Enter project address, city, and state to calculate distance.'}</div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Mileage</div>
                  <div className="mt-1 font-semibold">{formatUsd(travelDecision.mileageCost)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{travelDecision.distanceStatus === 'Known' ? `${travelDecision.distance} mi x 2 x ${formatUsd(travelDecision.mileageRate)}` : 'Distance unknown; mileage not calculated'}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Hotel</div>
                  <div className="mt-1 font-semibold">{formatUsd(travelDecision.hotelCost)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatUsd(travelDecision.hotelPerNight)} x {realityEstimation?.workersNeeded ?? 1} workers x {Math.max(0, (realityEstimation?.desiredProjectDays ?? 1) - 1)} nights</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Per Diem</div>
                  <div className="mt-1 font-semibold">{formatUsd(travelDecision.perDiemCost)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatUsd(travelDecision.perDiemPerDay)} x {realityEstimation?.workersNeeded ?? 1} workers x {formatRealityNumber(realityEstimation?.desiredProjectDays ?? 1)} days</div>
                </div>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Travel Decision Cost</div>
                <div className="mt-1 text-xl font-semibold">{formatUsd(travelDecision.totalTravelDecisionCost)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Planning-only value. Locked pricing travel cost remains {pricingSnapshot ? formatUsd(pricingSnapshot.base.travelCost) : formatUsd(0)}.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Price Override</CardTitle>
              <CardDescription>Override the calculated total price (leave blank to use calculated price)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">$</span>
                  <Input
                    type="number"
                    placeholder="e.g. 595"
                    value={manualLockedPriceOverride}
                    onChange={(e) => setManualLockedPriceOverride(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-32"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:flex-1">
                  <span className="text-sm text-muted-foreground">Leave blank to use calculated price</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManualLockedPriceOverride(595)}
                  >
                    Set to Minimum ($595)
                  </Button>
                </div>
              </div>
              {manualLockedPriceOverride !== '' && Number(manualLockedPriceOverride) < 595 ? (
                <p className="mt-3 text-sm text-amber-600">Below standard minimum price ($595).</p>
              ) : null}
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><ClipboardList className="h-5 w-5" /> 7. Locked Pricing Review</div>
            {pricingSnapshot ? (
              <LockedPricingReviewCard
                snapshot={pricingSnapshot}
                description="Final pricing snapshot saved with the bid. Reality estimation does not alter these totals."
                showRealityEstimation={false}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Review</CardTitle>
                  <CardDescription>The shared pricing snapshot will appear here.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">No pricing preview yet.</CardContent>
              </Card>
            )}
          </div>

          <Button className="w-full" onClick={handleCreateBid} disabled={createBidMutation.isPending || !pricingSnapshot}>
            {(createBidMutation.isPending || pricingLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Bid Using Locked Pricing
          </Button>
        </div>
      </div>

      <ServicesConfigModal
        isOpen={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        onSave={setServicesConfig}
        initialConfig={servicesConfig}
        isPrivateWage={isPrivateWage}
      />
    </div>
  );
}
