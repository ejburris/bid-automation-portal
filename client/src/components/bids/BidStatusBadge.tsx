import { Badge } from "@/components/ui/badge";
import { getBidStatusClasses, getBidStatusLabel } from "@/lib/bidBackbone";

export function BidStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={getBidStatusClasses(status)}>
      {getBidStatusLabel(status)}
    </Badge>
  );
}
