// my code
import React, { useState } from 'react';
import { Layout, LogOut, Menu, X, Moon, Sun, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setCurrentPage('landing');
    setMobileMenuOpen(false);
  };

  const navItems = user ? [
    { name: 'Dashboard', page: 'dashboard' },
    { name: 'Profile', page: 'profile' },
    { name: 'Feedback', page: 'feedback'},
    { name: 'About us', page: 'aboutus'},
    { name: 'Template Editor', page: 'template-editor'},
    { name: 'Attendance', page: 'attendence' }
  ] : [];

  return (
    <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setCurrentPage('landing')}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-amber-500 p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Flame className="text-white" size={24} />
              </div>
            </div>
            <span className="text-xl font-black text-gray-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              SeatAlloc
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map(item => (
              <React.Fragment key={item.page}>
                <button
                  onClick={() => setCurrentPage(item.page)}
                  className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    currentPage === item.page 
                      ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.name}
                  {currentPage === item.page && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                  )}
                </button>

                {user && item.page === 'dashboard' && (
                  <button
                    onClick={() => setCurrentPage('create-plan')}
                    className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      currentPage === 'create-plan' 
                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Create
                    {currentPage === 'create-plan' && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                    )}
                  </button>
                )}
              </React.Fragment>
            ))}
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-110 ml-2"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="text-gray-700 dark:text-gray-300" size={20} />
              ) : (
                <Sun className="text-amber-500" size={20} />
              )}
            </button>

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 font-semibold ml-2"
              >
                <LogOut size={18} />
                Logout
              </button>
            ) : (
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => setCurrentPage('login')}
                  className="text-orange-600 dark:text-orange-400 px-4 py-2 rounded-lg border-2 border-orange-600 dark:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200 font-semibold"
                >
                  Login
                </button>
                <button
                  onClick={() => setCurrentPage('signup')}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="text-gray-700 dark:text-gray-300" size={20} />
              ) : (
                <Sun className="text-amber-500" size={20} />
              )}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 animate-slideDown">
            <div className="py-2 space-y-1">
              {navItems.map(item => (
                <React.Fragment key={item.page}>
                  <button
                    onClick={() => {
                      setCurrentPage(item.page);
                      setMobileMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                      currentPage === item.page
                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.name}
                  </button>

                  {user && item.page === 'dashboard' && (
                    <button
                      onClick={() => {
                        setCurrentPage('create-plan');
                        setMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                        currentPage === 'create-plan'
                          ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      Create
                    </button>
                  )}
                </React.Fragment>
              ))}
              
              {user ? (
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all mt-2"
                >
                  <LogOut className="inline mr-2" size={18} />
                  Logout
                </button>
              ) : (
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setCurrentPage('login');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-center px-4 py-3 text-sm font-semibold text-orange-600 dark:text-orange-400 border-2 border-orange-600 dark:border-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('signup');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-center px-4 py-3 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;