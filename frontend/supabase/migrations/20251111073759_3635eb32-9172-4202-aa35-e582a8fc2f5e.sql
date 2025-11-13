-- Create app role enum

-- Create profiles table
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles

-- Create user_roles table (separate from profiles for security)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles

-- Create security definer function to check roles (prevents recursive RLS issues)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create services table
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on services

-- Create bookings table
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on bookings

-- RLS Policies for profiles
-- Supabase migrations removed; backend/database no longer included in this repo.
CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, address)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'address', '')
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services
INSERT INTO public.services (title, description, category, price, duration, image_url) VALUES
('Deep House Cleaning', 'Professional deep cleaning service for your entire home. Includes all rooms, kitchen, and bathrooms with eco-friendly products.', 'Cleaning', 120.00, '3-4 hours', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'),
('Appliance Repair', 'Expert repair service for all home appliances including refrigerators, washing machines, and dryers.', 'Repair', 80.00, '1-2 hours', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80'),
('Plumbing Services', 'Licensed plumbers for leak repairs, pipe installations, and emergency plumbing services.', 'Plumbing', 90.00, '1-3 hours', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80'),
('Electrical Work', 'Certified electricians for installations, repairs, wiring, and electrical safety inspections.', 'Electrical', 100.00, '1-3 hours', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80'),
('Regular Cleaning', 'Weekly or bi-weekly cleaning service to maintain your home''s cleanliness.', 'Cleaning', 70.00, '2-3 hours', 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&q=80'),
('HVAC Maintenance', 'Keep your heating and cooling systems running efficiently with professional maintenance.', 'Repair', 110.00, '2-3 hours', 'https://images.unsplash.com/photo-1635274703412-e449213044c8?w=800&q=80'),
('Kitchen Deep Clean', 'Specialized deep cleaning service focused on kitchen areas including appliances and cabinets.', 'Cleaning', 85.00, '2-3 hours', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80'),
('Emergency Plumbing', '24/7 emergency plumbing service for urgent repairs and water damage prevention.', 'Plumbing', 150.00, '1-2 hours', 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80');