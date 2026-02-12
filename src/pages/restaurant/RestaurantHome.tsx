import React, { useEffect, useState } from "react";
import { ShoppingBag, UtensilsCrossed, DollarSign, Clock, Globe } from "lucide-react";
import { Card, Badge, Loading } from "../../components/ui";
import { getRestaurantStats } from "../../services/restaurantService";
import { formatCurrency } from "../../utils/helpers";

const RestaurantHome: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    loadStats();
  }, []);

  const loadStats = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const data = await getRestaurantStats(user.restaurant_id);
    setStats(data);
    setLoading(false);
  };

  if (loading) {
    return <Loading text={language === 'th' ? 'กำลังโหลดแดชบอร์ด...' : 'Loading dashboard...'} />;
  }

  const translations = {
    en: {
      dashboard: 'Dashboard',
      welcome: "Welcome back! Here's your restaurant overview",
      pendingOrders: 'Pending Orders',
      todayOrders: "Today's Orders",
      todayRevenue: "Today's Revenue",
      menuItems: 'Menu Items',
      quickActions: 'Quick Actions',
      viewOrders: 'View Orders',
      manageOrders: 'Manage incoming orders',
      viewMenu: 'View Menu',
      manageMenu: 'Update menu items',
      viewReports: 'View Reports',
      salesAnalytics: 'Sales and analytics',
    },
    th: {
      dashboard: 'แดชบอร์ด',
      welcome: 'ยินดีต้อนรับกลับ! นี่คือภาพรวมร้านอาหารของคุณ',
      pendingOrders: 'คำสั่งซื้อที่รอดำเนินการ',
      todayOrders: 'คำสั่งซื้อวันนี้',
      todayRevenue: 'รายได้วันนี้',
      menuItems: 'รายการเมนู',
      quickActions: 'การดำเนินการด่วน',
      viewOrders: 'ดูคำสั่งซื้อ',
      manageOrders: 'จัดการคำสั่งซื้อขาเข้า',
      viewMenu: 'ดูเมนู',
      manageMenu: 'อัปเดตรายการเมนู',
      viewReports: 'ดูรายงาน',
      salesAnalytics: 'การขายและการวิเคราะห์',
    },
  };

  const t = translations[language];

  const statCards = [
    {
      title: t.pendingOrders,
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: t.todayOrders,
      value: stats?.todayOrders || 0,
      icon: ShoppingBag,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: t.todayRevenue,
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: t.menuItems,
      value: stats?.totalMenuItems || 0,
      icon: UtensilsCrossed,
      color: "text-accent-secondary",
      bgColor: "bg-accent-secondary/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Language Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-bg-subtle transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'en' ? 'ไทย' : 'EN'}</span>
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">{t.dashboard}</h2>
        <p className="text-text-secondary">
          {t.welcome}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">{t.quickActions}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a
            href="/restaurant/orders"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <ShoppingBag className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">{t.viewOrders}</p>
            <p className="text-sm text-text-secondary">
              {t.manageOrders}
            </p>
          </a>
          <a
            href="/restaurant/menu"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <UtensilsCrossed className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">{t.viewMenu}</p>
            <p className="text-sm text-text-secondary">{t.manageMenu}</p>
          </a>
          <a
            href="/restaurant/reports"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">{t.viewReports}</p>
            <p className="text-sm text-text-secondary">{t.salesAnalytics}</p>
          </a>
        </div>
      </Card>

      {/* Recent Orders Preview */}
      {stats?.recentOrders && stats.recentOrders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">Recent Orders</h3>
            <a
              href="/restaurant/orders"
              className="text-accent hover:underline text-sm"
            >
              View All
            </a>
          </div>
          <div className="space-y-3">
            {stats.recentOrders.slice(0, 5).map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text">
                    Order #{order.order_number}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {order.order_type} • {order.items?.length || 0} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text">
                    {formatCurrency(order.total)}
                  </p>
                  <Badge
                    variant={
                      order.status === "completed"
                        ? "success"
                        : order.status === "pending"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RestaurantHome;
