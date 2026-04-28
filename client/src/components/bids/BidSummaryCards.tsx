import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BidSummary, formatBidCurrency } from "@/lib/bidBackbone";
import { FileText, Clock3, Trophy, DollarSign } from "lucide-react";

export function BidSummaryCards({ summary }: { summary: BidSummary }) {
  const cards = [
    {
      title: 'Total Pipeline',
      value: String(summary.total),
      detail: formatBidCurrency(summary.totalValueCents),
      icon: FileText,
    },
    {
      title: 'Active Bids',
      value: String(summary.active),
      detail: `${summary.draft} draft · ${summary.sent} sent · ${summary.followUp} follow-up`,
      icon: Clock3,
    },
    {
      title: 'Win Rate',
      value: `${summary.winRate.toFixed(1)}%`,
      detail: `${summary.awarded} awarded / ${summary.lost} lost`,
      icon: Trophy,
    },
    {
      title: 'Average Bid',
      value: formatBidCurrency(summary.averageBidCents),
      detail: `${summary.followUpDueCount} follow-ups due`,
      icon: DollarSign,
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
