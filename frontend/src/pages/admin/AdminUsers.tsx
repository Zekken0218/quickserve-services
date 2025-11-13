import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { firebaseDb } from "@/integrations/firebase/client";
import { collection, onSnapshot } from "firebase/firestore";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  roles?: string[];
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUsers();
    // Realtime: listen to profiles and roles changes and refresh
    const unsubProfiles = onSnapshot(collection(firebaseDb, "user_profiles"), () => loadUsers());
    const unsubRoles = onSnapshot(collection(firebaseDb, "user_roles"), () => loadUsers());
    return () => {
      unsubProfiles();
      unsubRoles();
    };
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.get<User[]>("/api/admin/users/", true);
      setUsers(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("loadUsers", e);
    }
  };

  const filteredUsers = users.filter((user) => {
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  return (
    <AdminLayout>
      <div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Manage Users</h1>
        <p className="mb-8 text-muted-foreground">View all registered users</p>

        <Card className="mb-6 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users by name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{user.address || "-"}</TableCell>
                  <TableCell>
                    {(user.roles && user.roles.length > 0) ? (
                      user.roles.map((role, index) => (
                        <Badge key={index} variant={role === "admin" ? "default" : "secondary"}>
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">user</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
