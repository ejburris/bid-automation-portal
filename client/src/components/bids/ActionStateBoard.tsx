import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardActionState, formatBidCurrency, getActionToneClasses } from "@/lib/bidBackbone";
import { cn } from "@/lib/utils";

export function ActionStateBoard({ actionStates }: { actionStates: DashboardActionState[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Action State</CardTitle>
        <CardDescription>What needs movement now across drafts, live bids, and follow-ups.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actionStates.map((state) => (
            <div
              key={state.key}
              className={cn('rounded-xl border p-4', getActionToneClasses(state.tone))}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{state.title}</p>
                  <p className="mt-1 text-2xl font-bold">{state.count}</p>
                </div>
                <div className="rounded-full border border-current/20 px-2 py-1 text-xs font-medium uppercase tracking-wide">
                  {state.tone}
                </div>
              </div>
              <p className="mt-3 text-sm">{state.description}</p>
              <p className="mt-3 text-sm font-semibold">{formatBidCurrency(state.valueCents)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
