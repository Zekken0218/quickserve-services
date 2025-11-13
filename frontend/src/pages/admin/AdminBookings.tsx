import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { firebaseDb } from "@/integrations/firebase/client";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { formatPeso, formatTime12h } from "@/lib/utils";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  status: string;
  total_price: number;
  user_id: string;
  service_id: string;
  customer_name?: string;
  customer_email?: string;
  service_title?: string;
}

const AdminBookings = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadBookings();
    // Realtime: watch bookings changes and refresh via API (for enriched fields)
    const q = query(collection(firebaseDb, "bookings"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, () => {
      loadBookings();
    });
    return () => unsub();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await api.get<Booking[]>("/api/admin/bookings/", true);
      setBookings(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("loadBookings", e);
    }
  };

  const updateBookingStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/api/bookings/${id}/`, { status: newStatus }, true);
      toast({ title: "Success", description: "Booking status updated" });
      loadBookings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "confirmed":
        return "default";
      case "completed":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Manage Bookings</h1>
        <p className="mb-8 text-muted-foreground">View and manage all customer bookings</p>

        <Card className="mb-6 p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by customer or service..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.customer_name || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_email || "N/A"}</p>
                    </div>
                  </TableCell>
                  <TableCell>{booking.service_title || "N/A"}</TableCell>
                  <TableCell>
                    <div>
                      <p>{new Date(booking.booking_date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">{formatTime12h(booking.booking_time)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{booking.address}</TableCell>
                  <TableCell>{formatPeso(booking.total_price)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(booking.status) as any}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={booking.status}
                      onValueChange={(value) => updateBookingStatus(booking.id, value)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBookings;
