import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Calendar, DollarSign } from "lucide-react";
import { firebaseDb } from "@/integrations/firebase/client";
import { collection, onSnapshot, query, where } from "firebase/firestore";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalServices: 0,
    totalBookings: 0,
    pendingBookings: 0,
  });

  useEffect(() => {
    // Realtime counts via snapshot sizes
    const unsubProfiles = onSnapshot(collection(firebaseDb, "user_profiles"), (snap) => {
      setStats((prev) => ({ ...prev, totalUsers: snap.size }));
    });
    const unsubServices = onSnapshot(collection(firebaseDb, "services"), (snap) => {
      setStats((prev) => ({ ...prev, totalServices: snap.size }));
    });
    const unsubBookings = onSnapshot(collection(firebaseDb, "bookings"), (snap) => {
      setStats((prev) => ({ ...prev, totalBookings: snap.size }));
    });
    const unsubPending = onSnapshot(query(collection(firebaseDb, "bookings"), where("status", "==", "pending")), (snap) => {
      setStats((prev) => ({ ...prev, pendingBookings: snap.size }));
    });
    return () => {
      unsubProfiles();
      unsubServices();
      unsubBookings();
      unsubPending();
    };
  }, []);

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Services",
      value: stats.totalServices,
      icon: Briefcase,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Pending Bookings",
      value: stats.pendingBookings,
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <AdminLayout>
      <div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mb-8 text-muted-foreground">Overview of your booking system</p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={cn("rounded-full p-2", stat.bgColor)}>
                    <Icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

export default Dashboard;
