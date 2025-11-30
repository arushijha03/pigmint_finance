import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SpendingChart } from "@/components/SpendingChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { gcpApi, CategorySpend, User } from "@/lib/gcpApiClient";

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpend[]>([]);
  const [spendingPeriod, setSpendingPeriod] = useState<'this_month' | 'this_week' | 'all'>('this_month');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCategorySpending();
  }, [spendingPeriod]);

  const fetchData = async () => {
    try {
      const userData = await gcpApi.user.getMe();
      setUser(userData);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      toast.error(error.message || "Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorySpending = async () => {
    try {
      const data = await gcpApi.spending.getByCategory(spendingPeriod);
      setCategorySpending(data.categories);
    } catch (error: any) {
      console.error('Error fetching category spending:', error);
      toast.error(error.message || "Failed to fetch spending data");
    }
  };

  const totalSpending = categorySpending.reduce((sum, cat) => sum + cat.total, 0);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Financial Analytics</h1>
          <p className="text-muted-foreground">
            Track your spending patterns and savings progress
          </p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Additional analytics features like monthly trends and comparative insights will be available in future updates.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Total Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">
                ${user?.total_saved.toFixed(2) || "0.00"}
              </div>
              <p className="text-sm opacity-90 mt-2">Lifetime savings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Total Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">
                ${totalSpending.toFixed(2)}
              </div>
              <p className="text-sm opacity-90 mt-2">
                For selected period: {spendingPeriod.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <SpendingChart
            data={categorySpending}
            period={spendingPeriod}
            onPeriodChange={(period) => setSpendingPeriod(period as 'this_month' | 'this_week' | 'all')}
          />
        </div>

        {categorySpending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categorySpending.map((category, index) => {
                  const percentage = totalSpending > 0 ? (category.total / totalSpending) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{category.category}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold">${category.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Reports;
