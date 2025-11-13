import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { STATIC_CATEGORIES } from "@/lib/categories";
import { formatPeso } from "@/lib/utils";
import { firebaseDb, firebaseStorage } from "@/integrations/firebase/client";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot } from "firebase/firestore";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  duration: string;
  image_url: string | null;
  is_active: boolean;
}

const AdminServices = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    duration: "",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    loadServices();
    // Realtime: listen to services changes and refresh
    const unsub = onSnapshot(collection(firebaseDb, "services"), () => {
      loadServices();
    });
    return () => unsub();
  }, []);

  const loadServices = async () => {
    try {
      const data = await api.get<Service[]>("/api/services/");
      setServices(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("loadServices", e);
    }
  };


  // Static category options (shared)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(formData.price);
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!formData.category) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }

    // Upload image if a new file was selected
    let imageUrl: string | null = editingService ? (formData.image_url || null) : null;
    try {
      if (imageFile) {
        // Try backend local media upload first
        try {
          const fd = new FormData();
          fd.append("file", imageFile);
          const res = await api.upload<{ url: string }>("/api/uploads/service-image/", fd, true);
          imageUrl = res.url;
        } catch (backendErr) {
          // Fallback to Firebase Storage
          const path = `services/${Date.now()}-${imageFile.name}`;
          const fileRef = storageRef(firebaseStorage, path);
          await uploadBytes(fileRef, imageFile);
          imageUrl = await getDownloadURL(fileRef);
        }
      }
    } catch (uploadErr: any) {
      toast({ title: "Image upload failed", description: uploadErr?.message || "", variant: "destructive" });
      return;
    }

    const serviceData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      price: priceNum,
      duration: formData.duration.trim(),
      image_url: imageUrl,
      is_active: true,
    };

    try {
      if (editingService) {
        await api.put(`/api/services/${editingService.id}/`, serviceData, true);
        toast({ title: "Success", description: "Service updated successfully" });
      } else {
        await api.post("/api/services/", serviceData, true);
        toast({ title: "Success", description: "Service created successfully" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || (editingService ? "Failed to update service" : "Failed to create service"),
        variant: "destructive",
      });
    }

    setIsDialogOpen(false);
    setEditingService(null);
    setFormData({ title: "", description: "", category: "", price: "", duration: "", image_url: "" });
    setImageFile(null);
    loadServices();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/services/${id}/`, true);
      toast({ title: "Success", description: "Service deleted successfully" });
      loadServices();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price.toString(),
      duration: service.duration,
      image_url: service.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Manage Services</h1>
            <p className="text-muted-foreground">Add, edit, or remove services</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search services..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">{service.category}</Badge>
                  <span className="text-lg font-bold text-primary">{formatPeso(service.price)}</span>
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <CardDescription className="line-clamp-2">{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Duration: {service.duration}</p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(service)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(service.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
              <DialogDescription>Fill in the details for the service</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Service Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Ensure current value is present even if custom */}
                        {formData.category && !STATIC_CATEGORIES.includes(formData.category) && (
                          <SelectItem value={formData.category}>{formData.category}</SelectItem>
                        )}
                        {STATIC_CATEGORIES.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₱)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    placeholder="e.g., 2-3 hours"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_file">Service Image</Label>
                  <Input
                    id="image_file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  {editingService?.image_url && !imageFile && (
                    <p className="text-xs text-muted-foreground">Current image will be kept unless you upload a new one.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingService ? "Update" : "Create"} Service</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* No Category Dialog — categories are static now */}
      </div>
    </AdminLayout>
  );
};

export default AdminServices;
