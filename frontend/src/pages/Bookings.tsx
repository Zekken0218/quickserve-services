import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso, formatTime12h } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Bookings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formAddress, setFormAddress] = useState("");

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    try {
      const data = await api.get<any[]>("/api/bookings/", true);
      setBookings(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    setLoading(false);
  };

  const handleCancelBooking = async (id: string) => {
    try {
      await api.patch(`/api/bookings/${id}/`, { status: "cancelled" }, true);
      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled successfully",
      });
      loadBookings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const openEdit = (booking: any) => {
    setEditingBooking(booking);
    setFormDate(booking.booking_date?.slice(0,10));
    setFormTime(booking.booking_time || "");
    setFormAddress(booking.address || "");
    setEditing(true);
  };

  const submitEdit = async () => {
    if (!editingBooking) return;
    try {
      await api.patch(`/api/bookings/${editingBooking.id}/`, {
        booking_date: formDate,
        booking_time: formTime,
        address: formAddress,
      }, true);
      toast({ title: "Booking updated", description: "Your booking details were saved." });
      setEditing(false);
      setEditingBooking(null);
      loadBookings();
    } catch (e) {
      toast({ title: "Error", description: "Failed to update booking", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "warning";
      case "confirmed":
        return "default";
      case "completed":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">My Bookings</h1>
          <p className="text-muted-foreground">Manage and track your service bookings</p>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">You don't have any bookings yet</p>
              <Button className="mt-4" onClick={() => navigate("/services")}>Browse Services</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{booking.service_title}</CardTitle>
                    <Badge variant={getStatusColor(booking.status) as any}>
                      {booking.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-lg font-semibold text-primary">
                    {formatPeso(Number(booking.total_price))}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {new Date(booking.booking_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    {formatTime12h(booking.booking_time)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {booking.address}
                  </div>
                </CardContent>
                {booking.status !== "completed" && booking.status !== "cancelled" && (
                  <CardFooter className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(booking)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editing} onOpenChange={(o) => { if (!o) { setEditing(false); setEditingBooking(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>Update the date, time, or address for your booking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="booking_date">Date</Label>
              <Input id="booking_date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking_time">Time</Label>
              <Input id="booking_time" type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              {formTime && (
                <p className="text-xs text-muted-foreground">Selected: {formatTime12h(formTime)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="Service address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setEditing(false); setEditingBooking(null); }}>Cancel</Button>
            <Button onClick={submitEdit} disabled={!formDate || !formTime || !formAddress}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;
