import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ServiceCard from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, CheckCircle2, Clock, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn, formatPeso, formatTime12h } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<Date>();
  const [bookingTime, setBookingTime] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  useEffect(() => {
    api.get('/api/status/')
      .then((data) => setBackendStatus(String((data as any)?.status ?? "unknown")))
      .catch(() => setBackendStatus("offline"));
  }, []);

  const [services, setServices] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<any[]>("/api/services/");
        setServices(Array.isArray(data) ? data.slice(0, 6) : []); // featured: first 6
      } catch {
        setServices([]);
      }
    };
    load();
  }, []);

  const handleConfirmBooking = async () => {
    if (!selectedService) return;
    if (!bookingDate || !bookingTime || !bookingAddress) {
      toast({ title: "Missing information", description: "Please fill in all booking details", variant: "destructive" });
      return;
    }
    try {
      await api.post("/api/bookings/", {
        service_id: selectedService?.id,
        booking_date: format(bookingDate, "yyyy-MM-dd"),
        booking_time: bookingTime,
        address: bookingAddress,
      }, true);

      toast({
        title: "Booking confirmed!",
        description: `Your ${selectedService?.title} has been scheduled for ${format(bookingDate, "PPP")} at ${bookingTime}`,
      });

      setSelectedService(null);
      setBookingDate(undefined);
      setBookingTime("");
      setBookingAddress("");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to create booking", variant: "destructive" });
    }
  };

  const features = [
    {
      icon: CheckCircle2,
      title: "Verified Professionals",
      description: "All service providers are background-checked and certified"
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      description: "Book services at your convenience, 7 days a week"
    },
    {
      icon: Shield,
      title: "100% Guaranteed",
      description: "Your satisfaction is our priority with money-back guarantee"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Backend connectivity indicator */}
      {backendStatus && (
        <div className="container mx-auto mt-4 px-4 sm:px-6 lg:px-8">
          <div className="rounded-md bg-green-50 p-2 text-sm text-green-800">Backend: {backendStatus}</div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="mr-2 h-4 w-4" />
              Trusted by 10,000+ happy customers
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Home Services Made
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Simple</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Book trusted professionals for cleaning, repairs, and maintenance. Quality service at your doorstep.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-lg" onClick={() => navigate("/services")}>
                Browse Services
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="text-lg" onClick={() => navigate("/register")}>
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">Featured Services</h2>
            <p className="text-lg text-muted-foreground">Choose from our wide range of professional home services</p>
          </div>

          <div className="mb-8 mx-auto max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for services..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services
              .filter(service => 
                service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(service.category || "").toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((service) => (
                <ServiceCard
                  key={service.id}
                  title={service.title}
                  description={service.description}
                  price={formatPeso(service.price)}
                  category={service.category || "General"}
                  image={service.image_url || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"}
                  onBook={() => setSelectedService(service)}
                />
              ))}
          </div>
        </div>
      </section>

      {/* CTA Section (hidden when logged in) */}
      {!user && (
        <section className="bg-gradient-to-br from-primary to-primary/80 py-20 text-primary-foreground">
          <div className="container mx-auto px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Ready to get started?</h2>
            <p className="mb-8 text-lg opacity-90">Join thousands of satisfied customers today</p>
            <Button size="lg" variant="secondary" onClick={() => navigate("/register")}>
              Create Your Account
            </Button>
          </div>
        </section>
      )}

      {/* Service Details Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedService?.title}</DialogTitle>
            <DialogDescription>{selectedService?.description}</DialogDescription>
          </DialogHeader>
          {!user ? (
            <>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Category:</span>
                  <Badge variant="secondary">{selectedService?.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Price:</span>
                  <span className="text-lg font-bold text-primary">{formatPeso(selectedService?.price)}</span>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    To book this service, please create an account or log in to continue.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => navigate("/register")}>
                  Sign Up to Book
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>
                  Login
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                  <div>
                    <p className="text-sm font-medium">Service Price</p>
                    <p className="text-2xl font-bold text-primary">${selectedService?.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground">{selectedService?.category}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !bookingDate && "text-muted-foreground"
                        )}
                      >
                        {bookingDate ? format(bookingDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bookingDate}
                        onSelect={setBookingDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Preferred Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                  />
                  {bookingTime && (
                    <p className="text-xs text-muted-foreground">Selected: {formatTime12h(bookingTime)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Service Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter your address"
                    value={bookingAddress}
                    onChange={(e) => setBookingAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedService(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmBooking}>
                  Confirm Booking
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
