import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface GoalCardProps {
  title: string;
  current: number;
  target: number;
}

export const GoalCard = ({ title, current, target }: GoalCardProps) => {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">
            ${current.toFixed(2)} / ${target.toFixed(2)}
          </p>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    </Card>
  );
};
