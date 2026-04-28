import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { setCachedProposal } from '@/lib/proposalCache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function GenerateProposal() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    squareFootage: '',
    buildingStories: '',
    wageType: 'private' as 'private' | 'prevailing',
    includeWindowWashing: false,
    includeWaxing: false,
    projectLocation: '',
    notes: '',
  });

  const generateMutation = trpc.proposals.generate.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.projectId.trim()) {
      toast.error('Please enter a project ID');
      return;
    }

    if (!formData.squareFootage || parseFloat(formData.squareFootage) <= 0) {
      toast.error('Please enter a valid square footage');
      return;
    }

    if (!formData.buildingStories || parseInt(formData.buildingStories) < 1) {
      toast.error('Please enter a valid number of building stories');
      return;
    }

    try {
      setIsLoading(true);
      const result = await generateMutation.mutateAsync({
        projectId: parseInt(formData.projectId),
        squareFootage: parseFloat(formData.squareFootage),
        buildingStories: parseInt(formData.buildingStories),
        wageType: formData.wageType,
        includeWindowWashing: formData.includeWindowWashing,
        includeWaxing: formData.includeWaxing,
        projectLocation: formData.projectLocation || undefined,
        notes: formData.notes || undefined,
      });

      toast.success('Proposal generated successfully');
      // Cache the result to avoid immediate refetch
      setCachedProposal(result.bidId, result.proposal, result.costBreakdown, result.costItems);
      // Navigate to proposal detail page
      setTimeout(() => navigate(`/proposals/${result.bidId}`), 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate proposal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate New Proposal</h1>
          <p className="text-gray-600 mt-2">Create a new bid proposal with custom parameters</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proposal Details</CardTitle>
            <CardDescription>Enter project information to generate a proposal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project ID */}
              <div>
                <Label htmlFor="projectId">Project ID *</Label>
                <Input
                  id="projectId"
                  name="projectId"
                  type="text"
                  placeholder="Enter project ID"
                  value={formData.projectId}
                  onChange={handleInputChange}
                  required
                  className="mt-2"
                />
              </div>

              {/* Square Footage */}
              <div>
                <Label htmlFor="squareFootage">Square Footage *</Label>
                <Input
                  id="squareFootage"
                  name="squareFootage"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.squareFootage}
                  onChange={handleInputChange}
                  required
                  className="mt-2"
                />
              </div>

              {/* Building Stories */}
              <div>
                <Label htmlFor="buildingStories">Building Stories *</Label>
                <Input
                  id="buildingStories"
                  name="buildingStories"
                  type="number"
                  placeholder="e.g., 2"
                  value={formData.buildingStories}
                  onChange={handleInputChange}
                  required
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Note: Buildings with more than 2 stories will require an aerial lift
                </p>
              </div>

              {/* Wage Type */}
              <div>
                <Label htmlFor="wageType">Wage Type</Label>
                <Select value={formData.wageType} onValueChange={(value) => handleSelectChange('wageType', value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private Wage ($39.44/hr)</SelectItem>
                    <SelectItem value="prevailing">Prevailing Wage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Location */}
              <div>
                <Label htmlFor="projectLocation">Project Location</Label>
                <Input
                  id="projectLocation"
                  name="projectLocation"
                  type="text"
                  placeholder="e.g., Portland, OR"
                  value={formData.projectLocation}
                  onChange={handleInputChange}
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Leave blank for local projects. Travel costs will be added for projects &gt; 120 miles away
                </p>
              </div>

              {/* Services */}
              <div className="space-y-3">
                <Label>Additional Services</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="windowWashing"
                    checked={formData.includeWindowWashing}
                    onCheckedChange={(checked) => handleCheckboxChange('includeWindowWashing', !!checked)}
                  />
                  <Label htmlFor="windowWashing" className="font-normal cursor-pointer">
                    Include Window Washing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waxing"
                    checked={formData.includeWaxing}
                    onCheckedChange={(checked) => handleCheckboxChange('includeWaxing', !!checked)}
                  />
                  <Label htmlFor="waxing" className="font-normal cursor-pointer">
                    Include Waxing
                  </Label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Add any additional notes about this proposal..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-2 min-h-24"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Proposal'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/bids')}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Pricing Formula
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Private Wage:</strong> $22/hr × 1.255 (office multiplier) ÷ 0.7 (profit margin) = $39.44/hr
            </p>
            <p>
              <strong>Prevailing Wage:</strong> Jurisdiction wage × 1.255 ÷ 0.7
            </p>
            <p>
              <strong>Travel Costs:</strong> $39/person/hr for travel time + $50/person/day meals + hotel costs
            </p>
            <p>
              <strong>Aerial Lift:</strong> Required for buildings &gt; 2 stories
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
