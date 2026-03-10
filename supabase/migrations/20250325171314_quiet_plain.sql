/*
  # Enable Email Authentication
  
  1. Changes
    - Create auth trigger function for handling user creation
    - Create profiles table trigger
    - Set up initial admin user
*/

-- Create a trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, title)
  VALUES (new.id, new.email, 'Admin User');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: Email authentication is enabled by default in Supabase
-- We don't need to modify auth.config as it's managed through the Supabase dashboard