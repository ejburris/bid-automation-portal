import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { DollarSign, Percent } from "lucide-react";

export default function Parameters() {
  const { data: parameters, isLoading } = trpc.parameters.getByUser.useQuery();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return <div className="text-center py-8">Loading parameters...</div>;
  }

  if (!parameters) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bid Parameters</h1>
          <p className="text-gray-600 mt-2">Configure your pricing logic and wage rates.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              No parameters configured yet. Please contact your administrator.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCents = (cents: number | null | undefined) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const parameterGroups = [
    {
      title: "Company Information",
      fields: [
        { label: "Company Name", value: parameters.companyName },
        { label: "Base Location", value: parameters.baseLocation },
      ],
    },
    {
      title: "Wage Rates",
      fields: [
        { label: "Private Wage (Hourly)", value: formatCents(parameters.privateWageHourly), icon: DollarSign },
        { label: "Work Day Hours", value: `${parameters.workDayHours} hours` },
      ],
    },
    {
      title: "Cleaning Costs",
      fields: [
        { label: "Waxing Cost/Sqft", value: formatCents(parameters.waxingCostPerSqft) },
        { label: "Carpet Cost/Sqft", value: formatCents(parameters.carpetCostPerSqft) },
        { label: "Window Base Price/Window", value: formatCents(parameters.windowBasePricePerWindow) },
      ],
    },
    {
      title: "Travel Costs",
      fields: [
        { label: "Cost Per Mile", value: formatCents(parameters.travelCostPerMile) },
        { label: "Hotel Cost/Night", value: formatCents(parameters.hotelCostPerNight) },
        { label: "Per Diem", value: formatCents(parameters.perDiem) },
      ],
    },
    {
      title: "Additional Costs",
      fields: [
        { label: "Additional Cost %", value: `${parameters.additionalCostPercentage}%`, icon: Percent },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bid Parameters</h1>
          <p className="text-gray-600 mt-2">Configure your pricing logic and wage rates.</p>
        </div>
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {parameterGroups.map((group, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="text-lg">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map((field: any, fieldIdx: number) => (
                <div key={fieldIdx}>
                  <Label className="text-sm text-gray-600">{field.label}</Label>
                  {isEditing ? (
                    <Input
                      defaultValue={field.value || ""}
                      className="mt-1"
                      placeholder={field.label}
                    />
                  ) : (
                    <div className="mt-1 text-base font-medium text-gray-900">
                      {field.value}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {isEditing && (
        <div className="flex gap-4">
          <Button variant="default">Save Changes</Button>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Prevailing Wage Rates Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Prevailing Wage Rates</h2>
        <Card>
          <CardHeader>
            <CardTitle>Jurisdiction-Based Rates</CardTitle>
            <CardDescription>
              Prevailing wage rates vary by jurisdiction and effective date. Add rates for your service areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Prevailing wage rates will be displayed here once configured.</p>
              <Button className="mt-4" variant="outline">
                Add Prevailing Wage Rate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
