import { Header } from "@/components/Header";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SpendingChart } from "@/components/SpendingChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Lightbulb, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { gcpApi, DashboardOverview, Transaction, CategorySpend, User } from "@/lib/gcpApiClient";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    merchant: "",
    amount: "",
    category: "",
  });
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpend[]>([]);
  const [spendingPeriod, setSpendingPeriod] = useState<'this_month' | 'this_week' | 'all'>('this_month');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCategorySpending();
  }, [spendingPeriod]);

  const fetchData = async () => {
    try {
      const [overviewData, transactionsData, userData] = await Promise.all([
        gcpApi.dashboard.getOverview(),
        gcpApi.transactions.getRecent(10),
        gcpApi.user.getMe(),
      ]);

      setOverview(overviewData);
      setTransactions(transactionsData.transactions);
      setUser(userData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || "Failed to fetch dashboard data");
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

  const handleAddTransaction = async () => {
    if (!newTransaction.merchant || !newTransaction.amount || !newTransaction.category) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await gcpApi.transactions.simulate({
        amount: parseFloat(newTransaction.amount),
        merchant: newTransaction.merchant,
        category: newTransaction.category,
      });

      toast.success(`Transaction simulated: ${newTransaction.merchant} - $${newTransaction.amount}`);

      setIsAddTransactionOpen(false);
      setNewTransaction({
        merchant: "",
        amount: "",
        category: "",
      });

      setTimeout(() => {
        fetchData();
        fetchCategorySpending();
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Failed to simulate transaction");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {user?.email.charAt(0).toUpperCase() || "D"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">Welcome back, Demo User!</h2>
            <p className="text-muted-foreground">Here's your savings overview</p>
          </div>
        </div>

        <div className="mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Saved</p>
                  <h3 className="text-4xl font-bold">${overview?.total_saved.toFixed(2) || "0.00"}</h3>
                </div>
                <DollarSign className="w-16 h-16 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">My Savings Goals</h2>
                <Button onClick={() => navigate("/goals")}>View All Goals</Button>
              </div>
              {overview?.goals && overview.goals.length > 0 ? (
                <div className="space-y-4">
                  {overview.goals.slice(0, 2).map((goal) => (
                    <Card key={goal.goal_id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{goal.name}</h3>
                            <span className="text-sm text-muted-foreground">
                              {Math.round((goal.current_amount / goal.target_amount) * 100)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Progress value={(goal.current_amount / goal.target_amount) * 100} className="h-3" />
                            <p className="text-sm text-muted-foreground">
                              ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>No goals yet. Create one to get started!</p>
                  </CardContent>
                </Card>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Latest Recommendation</h2>
              {overview?.latest_recommendation ? (
                <RecommendationCard
                  icon={Lightbulb}
                  title={overview.latest_recommendation.title}
                  description={overview.latest_recommendation.message}
                  saveAmount=""
                  goals={[]}
                  onSave={() => {}}
                  onDismiss={() => {
                    setOverview(prev => prev ? { ...prev, latest_recommendation: null } : null);
                    toast("Recommendation dismissed");
                  }}
                  hideActions={true}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>No recommendations at the moment. Keep tracking your spending!</p>
                  </CardContent>
                </Card>
              )}
            </section>

            <SpendingChart
              data={categorySpending}
              period={spendingPeriod}
              onPeriodChange={(period) => setSpendingPeriod(period as 'this_month' | 'this_week' | 'all')}
            />
          </div>

          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Recent Transactions</h2>
                <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setNewTransaction({
                        merchant: "",
                        amount: "",
                        category: "",
                      });
                    }}>+ Simulate Transaction</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Simulate a Transaction</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="merchant">Merchant Name</Label>
                        <Input
                          id="merchant"
                          placeholder="Starbucks"
                          value={newTransaction.merchant}
                          onChange={(e) => setNewTransaction({...newTransaction, merchant: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="4.45"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          placeholder="Coffee"
                          value={newTransaction.category}
                          onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                        />
                      </div>
                      <Button onClick={handleAddTransaction} className="w-full">
                        Simulate Transaction
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Card>
                <CardContent className="pt-6">
                  {transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.transaction_id}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex-1">
                            <p className="font-semibold">{transaction.merchant}</p>
                            <p className="text-sm text-muted-foreground">{transaction.category}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${transaction.amount.toFixed(2)}</p>
                            {transaction.pigmint_action_total > 0 && (
                              <p className="text-xs text-green-600">
                                +${transaction.pigmint_action_total.toFixed(2)} saved
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No transactions yet. Simulate one to get started!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
