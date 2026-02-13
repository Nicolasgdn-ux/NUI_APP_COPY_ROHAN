import React, { useEffect, useState } from "react";
import {
  useNavigate,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  Store as StoreIcon,
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Table as TableIcon,
  FileText,
  Settings,
  Globe,
} from "lucide-react";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Tables from "./Tables";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";

const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  // Language state with auto-detection
  const [language, setLanguage] = useState<'en' | 'th'>(() => {
    const saved = localStorage.getItem('restaurantLanguage');
    if (saved) return saved as 'en' | 'th';

    // Auto-detect browser language
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    const langCode = browserLang.toLowerCase().split('-')[0];
    return langCode === 'th' ? 'th' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('restaurantLanguage', language);
  }, [language]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // In real app, fetch restaurant data
      setRestaurant({
        name: "Demo Restaurant",
        slug: "demo-restaurant",
      });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: language === 'th' ? 'แดชบอร์ด' : 'Dashboard' },
    { path: "/restaurant/orders", icon: ShoppingBag, label: language === 'th' ? 'คำสั่งซื้อ' : 'Orders' },
    { path: "/restaurant/tables", icon: TableIcon, label: language === 'th' ? 'โต๊ะ' : 'Tables' },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: language === 'th' ? 'เมนู' : 'Menu' },
    { path: "/restaurant/reports", icon: FileText, label: language === 'th' ? 'รายงาน' : 'Reports' },
    { path: "/restaurant/settings", icon: Settings, label: language === 'th' ? 'ตั้งค่า' : 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-bg-subtle">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-40">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <StoreIcon className="w-8 h-8 text-accent" />
              <div>
                <h1 className="text-lg font-bold text-text">
                  {restaurant?.name || "Restaurant"}
                </h1>
                <p className="text-xs text-text-secondary">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <Globe className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">{language === 'en' ? 'ไทย' : 'EN'}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-text-secondary hover:text-error transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>{language === 'th' ? 'ออกจากระบบ' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="bg-white border-b border-border">
        <div className="container-custom">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${isActive
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-text-secondary hover:text-text"
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom py-8">
        <Routes>
          <Route index element={<RestaurantHome language={language} />} />
          <Route path="orders" element={<Orders language={language} />} />
          <Route path="tables" element={<Tables language={language} />} />
          <Route path="menu" element={<Menu language={language} />} />
          <Route path="reports" element={<Reports language={language} />} />
          <Route path="settings" element={<RestaurantSettings language={language} />} />
        </Routes>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
