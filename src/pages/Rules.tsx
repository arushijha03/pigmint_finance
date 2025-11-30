import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { gcpApi } from "@/lib/gcpApiClient";

const Rules = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [autoRoundup, setAutoRoundup] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const data = await gcpApi.rules.getAll();
      setAutoRoundup(data.rules.roundup.is_active);
    } catch (error: any) {
      console.error('Error fetching rules:', error);
      toast.error(error.message || "Failed to fetch rules");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRoundup = async (enabled: boolean) => {
    try {
      await gcpApi.rules.toggleRoundup(enabled);
      setAutoRoundup(enabled);
      toast.success(`Round-up rule ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update rule");
      setAutoRoundup(!enabled);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Rules help you automatically save money with every transaction. Configure your preferences below.
            </AlertDescription>
          </Alert>

          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Automated Rules</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="auto-roundup" className="text-base font-semibold">
                    Round-up Savings
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically round up all transactions to the nearest dollar and save the difference
                  </p>
                </div>
                <Switch
                  id="auto-roundup"
                  checked={autoRoundup}
                  onCheckedChange={handleToggleRoundup}
                />
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Rules;
