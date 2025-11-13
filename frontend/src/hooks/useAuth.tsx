import { createContext, useContext, useEffect, useState } from "react";
import { firebaseAuth, firebaseDb } from "@/integrations/firebase/client";
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    metadata: Record<string, any>,
    opts?: { silent?: boolean }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (u) => {
      setUser(u);
      if (u) {
        await checkAdminStatus(u.uid);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const ref = doc(firebaseDb, "user_roles", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const is = data.role === "admin";
        setIsAdmin(is);
        return is;
      }
      setIsAdmin(false);
      return false;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("checkAdminStatus error", err);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      let admin = false;
      if (cred.user?.uid) {
        admin = await checkAdminStatus(cred.user.uid);
      }
      toast({ title: "Welcome back!", description: "Signed in successfully." });
      return admin;
    } catch (err: any) {
      toast({ title: "Error signing in", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: Record<string, any>,
    opts?: { silent?: boolean }
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Try to store metadata, but don't fail signup if Firestore rules block it
      if (Object.keys(metadata || {}).length) {
        try {
          await setDoc(doc(firebaseDb, "user_profiles", cred.user.uid), metadata, { merge: true });
        } catch (metaErr) {
          // eslint-disable-next-line no-console
          console.warn("Profile save failed (non-fatal)", metaErr);
        }
      }
      if (!opts?.silent) {
        toast({ title: "Account created!", description: "Welcome aboard." });
      }
    } catch (err: any) {
      toast({ title: "Error signing up", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
      setIsAdmin(false);
      navigate("/");
      toast({ title: "Signed out", description: "You have been signed out successfully" });
    } catch (err: any) {
      toast({ title: "Error signing out", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const getIdToken = async () => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
