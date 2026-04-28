import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BidSummary, formatBidCurrency } from "@/lib/bidBackbone";
import { BriefcaseBusiness, ClipboardCheck, HandCoins, TrendingUp } from "lucide-react";

export function PipelineValueCards({ summary }: { summary: BidSummary }) {
  const cards = [
    {
      title: 'Draft Value',
      value: formatBidCurrency(summary.draftValueCents),
      detail: `${summary.draft} draft bids`,
      icon: ClipboardCheck,
    },
    {
      title: 'Live Pipeline Value',
      value: formatBidCurrency(summary.sentValueCents + summary.followUpValueCents),
      detail: `${summary.sent + summary.followUp} live bids`,
      icon: TrendingUp,
    },
    {
      title: 'Awarded Value',
      value: formatBidCurrency(summary.awardedValueCents),
      detail: `${summary.awarded} awarded bids`,
      icon: HandCoins,
    },
    {
      title: 'Total Pipeline Value',
      value: formatBidCurrency(summary.totalValueCents),
      detail: `${summary.total} bids tracked`,
      icon: BriefcaseBusiness,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="mt-1 text-xs text-gray-500">{card.detail}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
