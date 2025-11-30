import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { GoalCard } from "@/components/GoalCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { gcpApi, Goal } from "@/lib/gcpApiClient";

const Goals = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalName, setGoalName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await gcpApi.goals.getAll();
      setGoals(data.goals);
    } catch (error: any) {
      console.error('Error fetching goals:', error);
      toast.error(error.message || "Failed to fetch goals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!goalName || !totalAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await gcpApi.goals.create({
        name: goalName,
        target_amount: parseFloat(totalAmount),
      });

      setGoalName("");
      setTotalAmount("");
      toast.success(`Goal "${goalName}" created!`);
      fetchGoals();
    } catch (error: any) {
      toast.error(error.message || "Failed to create goal");
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
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Create a New Goal</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="goalName">Goal Name</Label>
                <Input
                  id="goalName"
                  placeholder="e.g., Vacation"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  placeholder="e.g., 1000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateGoal} className="w-full">
                Create Goal
              </Button>
            </div>
          </Card>

          <div>
            <h2 className="text-2xl font-bold mb-4">My Active Goals</h2>
            <div className="space-y-4">
              {goals.length > 0 ? (
                goals.map((goal) => (
                  <GoalCard
                    key={goal.goal_id}
                    title={goal.name}
                    current={goal.current_amount}
                    target={goal.target_amount}
                  />
                ))
              ) : (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No goals yet. Create one above to get started!</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Goals;
