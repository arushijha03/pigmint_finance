import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Mail, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { gcpApi, User } from "@/lib/gcpApiClient";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is a demo account. Profile editing features will be available in future updates.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {user?.email.charAt(0).toUpperCase() || "D"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">Demo User</h3>
                  <p className="text-sm text-muted-foreground">PigMint Finance Member</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Mail className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base">{user?.email || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <DollarSign className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-base font-mono">{user?.user_id || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <DollarSign className="w-5 h-5 mt-0.5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-600">Total Saved</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${user?.total_saved.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Additional account management features coming soon:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Edit profile information</li>
                <li>Change password</li>
                <li>Notification preferences</li>
                <li>Monthly income tracking</li>
                <li>Export transaction history</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
