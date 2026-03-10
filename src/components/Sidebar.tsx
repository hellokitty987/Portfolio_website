import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Briefcase,
  FileText,
  GraduationCap,
  Mail,
  User,
  LogOut,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

interface ProfileSettings {
  name: string;
  title: string;
  avatar_url: string;
  github_url: string;
  twitter_url: string;
  linkedin_url: string;
}

const defaultSettings: ProfileSettings = {
  name: '',
  title: '',
  avatar_url: '',
  github_url: '#',
  twitter_url: '#',
  linkedin_url: '#',
};

const navItems: NavItem[] = [
  { path: '/', label: 'About', icon: <Home size={20} /> },
  { path: '/portfolio', label: 'Portfolio', icon: <Briefcase size={20} /> },
  { path: '/resume', label: 'Resume', icon: <FileText size={20} /> },
  { path: '/credentials', label: 'Credentials', icon: <GraduationCap size={20} /> },
  { path: '/contact', label: 'Contact', icon: <Mail size={20} /> },
  // { path: '/admin', label: 'Admin', icon: <User size={20} />, requiresAuth: true },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>(defaultSettings);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profile_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!error && data?.[0]) {
          setSettings(data[0]);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNavClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      navigate('/login');
      return;
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-lg md:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-gray-600 shadow-xl transition-transform duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:w-64 md:sticky
        `}
      >
        <div className="flex flex-col flex-grow p-6">
          {/* Profile Section */}
          <div className="text-center mb-8">
            {loading ? (
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-white flex items-center justify-center">
                Loading...
              </div>
            ) : (
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-white">
                <img
                  src={settings.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h2 className="text-xl font-bold text-red-200">
              {loading ? 'Loading...' : settings.name}
            </h2>
            <p className="text-gray-200 text-sm">{loading ? 'Loading...' : settings.title}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1">
            <ul className="space-y-2">
              {navItems.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={e => handleNavClick(item, e)}
                    className={({ isActive }) => `
                      flex items-center px-4 py-2 transition-colors
                      ${isActive ? 'text-red-200' : 'text-gray-200 hover:text-red-400'}
                    `}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Social Links */}
          <div className="mt-auto pt-6 border-t border-gray-500">
            <div className="flex justify-center space-x-4">
              <a
                href={settings.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#B19CD9] hover:text-red-200 transition-colors"
              >
                <svg viewBox="0 0 98 96" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="currentColor"
                    d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                  />
                </svg>
              </a>
              <a
                href={settings.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#B19CD9] hover:text-red-200 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="currentColor"
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </a>
              <a
                href={settings.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#B19CD9] hover:text-red-200 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="currentColor"
                    d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Sign Out Button (only show when authenticated) */}
          {isAuthenticated && (
            <button
              onClick={handleSignOut}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 text-gray-200 hover:text-red-200 transition-colors"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
