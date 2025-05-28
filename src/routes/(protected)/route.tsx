import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { ImageIcon, LogOut } from 'lucide-react';

import DefaultAvatar from '@/assets/default-avatar.jpg';
import Icon from '@/assets/icon.png';
import IconDark from '@/assets/icon-dark.png';
import Footer from '@/shared/components/Footer';
import { useSupabase } from '@/shared/context/supabase';
import { useTheme } from '@/shared/context/theme';
import useSignOut from '@/shared/hooks/useSignOut';
import { supabase } from '@/shared/services/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu';

export const Route = createFileRoute('/(protected)')({
  beforeLoad: ({ context }) => {
    if (!context.supabase.session) {
      throw redirect({ to: '/' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { colorScheme } = useTheme();
  const { user } = useSupabase();
  const signOut = useSignOut();

  // Fetch user profile data directly from Supabase
  const { data: profile } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate avatar initials from profile data if available
  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return null;
  };

  console.log('Initials:', getInitials());
  // Debug logs for profile data and avatar conditions
  console.log('Profile data:', profile);
  console.log('Avatar conditions:', {
    hasFirstName: Boolean(profile?.first_name),
    hasLastName: Boolean(profile?.last_name),
    hasNoAvatar: !profile?.avatar_url,
    showFallback:
      Boolean(profile?.first_name) &&
      Boolean(profile?.last_name) &&
      !profile?.avatar_url,
  });

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex justify-between items-center">
          <Link
            to="/gallery"
            className="flex items-center bg-background text-foreground"
          >
            <img
              src={colorScheme === 'dark' ? IconDark : Icon}
              alt="Jackalope Logo"
              className="w-10 h-10 rounded-xl mr-3"
            />
            <span className="text-xl font-bold">Jackalope</span>
          </Link>

          <nav className="flex items-center space-x-1">
            <Link to="/gallery">
              <Button variant="ghost" className="flex items-center gap-2">
                <ImageIcon size={18} />
                <span>Gallery</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-2 ml-2">
                  <Avatar className="h-8 w-8">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="Profile" />
                    ) : (
                      <AvatarImage src={DefaultAvatar} alt="Default Profile" />
                    )}
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Link to="/profile" className="w-full">
                  <DropdownMenuItem className="cursor-pointer">
                    Profile
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4 flex-1">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
