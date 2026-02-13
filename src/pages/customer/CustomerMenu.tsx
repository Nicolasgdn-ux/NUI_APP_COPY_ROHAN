import React, { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  CheckCircle,
  Package,
  AlertCircle,
  Receipt,
} from "lucide-react";
import {
  Card,
  Button,
  Modal,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createOrder,
  subscribeToTableOrders,
} from "../../services/restaurantService";
import type { MenuItem, Order } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { TableBill } from "../../components/TableBill";

interface CartItem extends MenuItem {
  quantity: number;
  selectedProtein?: 'shrimp' | 'squid' | 'seafood' | 'chicken' | 'pork';
  selectedPrice: number;
  spicyLevel?: 'none' | 'little' | 'medium' | 'very';
  biggerPortion?: boolean;
  selectedAddons: { name: string; price: number }[];
  itemTotal: number;
}

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get("table");
  const tableId = tableParam || "Takeaway";
  const isTableOrder = tableId !== "Takeaway";

  // Ref for scrolling to table orders
  const tableOrdersRef = useRef<HTMLDivElement>(null);

  // SessionID persistent - persiste même après reconnexion
  const [sessionId] = useState<string>(() => {
    const key = `session_table_${tableId}`;
    const existing = localStorage.getItem(key); // localStorage au lieu de sessionStorage
    if (existing) return existing;

    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, newId);
    return newId;
  });

  // Language selection with auto-detection
  const [language, setLanguage] = useState<'en' | 'th' | 'ru' | 'zh'>(() => {
    const saved = localStorage.getItem('userLanguage');
    if (saved) return saved as any;

    // Auto-detect browser language
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    const langCode = browserLang.toLowerCase().split('-')[0];

    if (langCode === 'zh') return 'zh';
    if (langCode === 'ru') return 'ru';
    if (langCode === 'th') return 'th';
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('userLanguage', language);
  }, [language]);

  // State for bill modal
  const [showBill, setShowBill] = useState(false);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Load restaurant and menu
  useEffect(() => {
    loadRestaurant();
  }, [slug]);

  useEffect(() => {
    if (restaurant?.id) {
      const subscription = subscribeToMenuItems(restaurant.id, (data) => {
        setMenuItems(data);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [restaurant]);

  useEffect(() => {
    if (restaurant?.id && isTableOrder) {
      const subscription = subscribeToTableOrders(
        restaurant.id,
        tableId,
        (data) => {
          setTableOrders(data);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [restaurant, isTableOrder, tableId]);

  const loadRestaurant = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("Restaurant not found");
      setLoading(false);
      return;
    }

    setRestaurant(data);
  };

  // Get item name in selected language - MUST be before filteredItems usage
  const getItemName = (item: MenuItem): string => {
    if (typeof item.name === 'object') {
      return item.name[language] || item.name.en || 'Item';
    }
    return item.name || 'Item';
  };

  // Translate category names
  const getCategoryName = (category: string): string => {
    const translations: Record<string, Record<string, string>> = {
      'Noodles': { en: 'Noodles', th: 'เส้น', ru: 'Лапша', zh: '面条' },
      'Rice': { en: 'Rice', th: 'ข้าว', ru: 'Рис', zh: '米饭' },
      'Curry': { en: 'Curry', th: 'แกง', ru: 'Карри', zh: '咖喱' },
      'Stir-fry': { en: 'Stir-fry', th: 'ผัด', ru: 'Жареное', zh: '炒菜' },
      'Appetizer': { en: 'Appetizer', th: 'ของทอด', ru: 'Закуски', zh: '小吃' },
      'Salad': { en: 'Salad', th: 'ยำ', ru: 'Салаты', zh: '沙拉' },
      'Vegetable': { en: 'Vegetable', th: 'ผัก', ru: 'Овощи', zh: '蔬菜' },
      'Soup': { en: 'Soup', th: 'ซุป', ru: 'Супы', zh: '汤' },
      'Dessert': { en: 'Dessert', th: 'ของหวาน', ru: 'Десерты', zh: '甜品' },
      'Beverage': { en: 'Beverage', th: 'เครื่องดื่ม', ru: 'Напитки', zh: '饮料' },
      'Add-ons': { en: 'Add-ons', th: 'เพิ่มเติม', ru: 'Добавки', zh: '附加' },
    };

    if (category === 'all') {
      return language === 'th' ? 'ทั้งหมด' : language === 'ru' ? 'Все' : language === 'zh' ? '全部' : 'All';
    }

    return translations[category]?.[language] || category;
  };

  // Get first available price (standard > seafood > chicken_pork)
  const getDisplayPrice = (item: MenuItem): number | null => {
    if (item.price_standard && item.price_standard > 0) {
      return item.price_standard;
    }
    if (item.price_seafood && item.price_seafood > 0) {
      return item.price_seafood;
    }
    if (item.price_chicken_pork && item.price_chicken_pork > 0) {
      return item.price_chicken_pork;
    }
    return null;
  };

  const getPriceLabel = (type: "standard" | "seafood" | "chicken_pork"): string => {
    const labels = {
      standard: {
        en: "Standard",
        th: "ธรรมดา",
        ru: "Стандарт",
        zh: "标准",
      },
      seafood: {
        en: "Seafood",
        th: "ทะเล",
        ru: "Морепродукты",
        zh: "海鲜",
      },
      chicken_pork: {
        en: "Chicken/Pork",
        th: "ไก่/หมู",
        ru: "Курица/Свинина",
        zh: "鸡肉/猪肉",
      },
    };

    return labels[type][language] || labels[type].en;
  };


  // Sort categories by first appearance in menu (by id_menu from CSV)
  const sortedCategories = () => {
    const categoriesInOrder: string[] = [];
    const seenCategories = new Set<string>();

    // Sort items by id_menu first
    const sortedItems = [...menuItems].sort((a, b) => {
      const aIdMenu = (a as any).id_menu || 0;
      const bIdMenu = (b as any).id_menu || 0;
      return aIdMenu - bIdMenu;
    });

    // Collect categories in order of first appearance
    sortedItems.forEach(item => {
      if (item.category && !seenCategories.has(item.category)) {
        categoriesInOrder.push(item.category);
        seenCategories.add(item.category);
      }
    });

    return ['all', ...categoriesInOrder];
  };

  const categories = sortedCategories();

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = getItemName(item)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const sortedFilteredItems =
    categoryFilter === "all"
      ? [...filteredItems].sort((a, b) => {
        const aIdMenu = a.id_menu ?? 0;
        const bIdMenu = b.id_menu ?? 0;
        return aIdMenu - bIdMenu;
      })
      : filteredItems;

  const addToCart = (
    item: MenuItem,
    selectedProtein?: string,
    selectedPrice?: number,
    spicyLevel?: string,
    biggerPortion?: boolean,
    selectedAddons: any[] = []
  ) => {
    const basePrice = selectedPrice || getDisplayPrice(item) || 0;
    const portionExtra = biggerPortion ? 20 : 0;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    const itemTotal = basePrice + portionExtra + addonsTotal;

    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      selectedProtein: selectedProtein as any,
      selectedPrice: basePrice,
      spicyLevel: spicyLevel as any,
      biggerPortion,
      selectedAddons,
      itemTotal,
    };

    const existingIndex = cart.findIndex(
      (ci) =>
        ci.id === item.id &&
        ci.selectedProtein === selectedProtein &&
        ci.spicyLevel === spicyLevel &&
        ci.biggerPortion === biggerPortion &&
        JSON.stringify(ci.selectedAddons) === JSON.stringify(selectedAddons)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, cartItem]);
    }

    setShowItemModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleItemClick = (item: MenuItem) => {
    // Always show modal for items with multiple price options or to choose spicy level
    const hasMultiplePrices = (item.price_seafood && item.price_seafood > 0) || (item.price_chicken_pork && item.price_chicken_pork > 0);

    if (hasMultiplePrices || item.sizes && item.sizes.length > 0) {
      setSelectedItem(item);
      setShowItemModal(true);
    } else {
      // Only items with single standard price can be added directly
      setSelectedItem(item);
      setShowItemModal(true); // Always show modal to let user choose spicy level and portion
    }
  };

  if (loading) {
    return <Loading text="Loading menu..." />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Card className="text-center p-8">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">
            Restaurant Not Found
          </h2>
          <p className="text-text-secondary">
            The restaurant you're looking for doesn't exist or is currently
            inactive.
          </p>
        </Card>
      </div>
    );
  }

  const getItemQuantity = (itemId: string) => {
    return cart.reduce((sum, cartItem) => {
      if (cartItem.id === itemId) {
        return sum + cartItem.quantity;
      }
      return sum;
    }, 0);
  };

  const handleRemoveItem = (itemId: string) => {
    const index = cart.findIndex((ci) => ci.id === itemId);
    if (index >= 0) {
      updateQuantity(index, -1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="font-bold text-lg text-gray-800">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-gray-500">
                  {restaurant.restaurant_type}
                </p>
              </div>
            </div>
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="en">🇬🇧 EN</option>
              <option value="th">🇹🇭 TH</option>
              <option value="ru">🇷🇺 RU</option>
              <option value="zh">🇨🇳 ZH</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for dishes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[108px] z-30">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${categoryFilter === category
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-gray-600"
                  }`}
              >
                {getCategoryName(category)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Orders Summary */}
      {isTableOrder && (
        <div className="max-w-screen-lg mx-auto px-4 py-4" ref={tableOrdersRef}>
          <Card className={`p-4 ${tableOrders.length > 0 ? 'border-2 border-accent bg-accent/5' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {tableOrders.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success text-white text-xs font-semibold">
                    <CheckCircle className="w-3 h-3" />
                    <span>{language === 'th' ? 'สั่งแล้ว' : language === 'ru' ? 'Заказано' : language === 'zh' ? '已点餐' : 'Ordered'}</span>
                  </div>
                )}
                <h3 className="font-semibold text-text">
                  {language === 'th'
                    ? `ออเดอร์โต๊ะ ${tableId}`
                    : language === 'ru'
                      ? `Заказы стола ${tableId}`
                      : language === 'zh'
                        ? `桌号 ${tableId} 的订单`
                        : `Table ${tableId} Orders`}
                </h3>
              </div>
              <span className="text-sm font-semibold text-accent">
                {tableOrders.length} {language === 'th' ? 'รายการ' : language === 'ru' ? 'позиций' : language === 'zh' ? '项' : 'items'}
              </span>
            </div>

            {tableOrders.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {language === 'th'
                    ? 'ยังไม่มีรายการสั่งซื้อสำหรับโต๊ะนี้'
                    : language === 'ru'
                      ? 'Пока нет заказов для этого стола'
                      : language === 'zh'
                        ? '该桌暂无订单'
                        : 'No orders yet for this table'}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {tableOrders.map((order) => (
                  <div key={order.id} className="text-sm">
                    <div className="font-medium text-text">
                      {order.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(" • ")}
                    </div>
                    <div className="text-text-secondary">
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>
                    {language === 'th'
                      ? 'รวมทั้งหมด'
                      : language === 'ru'
                        ? 'Итого'
                        : language === 'zh'
                          ? '总计'
                          : 'Total'}
                  </span>
                  <span>
                    {formatCurrency(
                      tableOrders.reduce((sum, order) => sum + (order.total || 0), 0)
                    )}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBill(true)}
                  icon={<Receipt className="w-4 h-4" />}
                  fullWidth
                  className="mt-3"
                >
                  {language === 'th'
                    ? 'ดูใบเสร็จ'
                    : language === 'ru'
                      ? 'Посмотреть счёт'
                      : language === 'zh'
                        ? '查看账单'
                        : 'View Bill'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {sortedFilteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedFilteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="relative h-36">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={getItemName(item)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                          Not Available
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 h-10">
                      {getItemName(item)}
                    </h3>

                    <div className="flex items-end justify-between mt-2">
                      <div className="space-y-0.5">
                        {[
                          item.price_standard && item.price_standard > 0
                            ? {
                              key: "standard",
                              label: getPriceLabel("standard"),
                              value: item.price_standard,
                            }
                            : null,
                          item.price_seafood && item.price_seafood > 0
                            ? {
                              key: "seafood",
                              label: getPriceLabel("seafood"),
                              value: item.price_seafood,
                            }
                            : null,
                          item.price_chicken_pork && item.price_chicken_pork > 0
                            ? {
                              key: "chicken_pork",
                              label: getPriceLabel("chicken_pork"),
                              value: item.price_chicken_pork,
                            }
                            : null,
                        ]
                          .filter(Boolean)
                          .map((price: any) => (
                            <p key={price.key} className="text-sm font-bold text-gray-800">
                              <span className="text-[11px] text-gray-500 mr-1">
                                {price.label}:
                              </span>
                              {formatCurrency(price.value)}
                            </p>
                          ))}
                      </div>

                      {item.is_available && (
                        <div className="flex-shrink-0">
                          {quantity === 0 ? (
                            <button
                              onClick={() => handleItemClick(item)}
                              className="px-5 py-1.5 border-2 border-accent text-accent font-bold text-xs rounded-md hover:shadow-md transition-shadow"
                            >
                              ADD
                            </button>
                          ) : (
                            <div className="flex items-center bg-accent text-white rounded-md">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="px-2 py-1 hover:bg-accent-hover rounded-l-md"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 font-bold text-sm">
                                {quantity}
                              </span>
                              <button
                                onClick={() => handleItemClick(item)}
                                className="px-2 py-1 hover:bg-accent-hover rounded-r-md"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={showCart}
        cart={cart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
        language={language}
      />

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        isOpen={showItemModal}
        item={selectedItem}
        onClose={() => setShowItemModal(false)}
        onAdd={addToCart}
        language={language}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        cart={cart}
        setCart={setCart}
        restaurantId={restaurant.id}
        tableId={tableId}
        sessionId={sessionId}
        isTableOrder={isTableOrder}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setCart([]);
          setShowCheckout(false);
          // Scroll to table orders section after successful checkout
          if (isTableOrder && tableOrdersRef.current) {
            setTimeout(() => {
              tableOrdersRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
          }
        }}
      />

      {/* Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-accent text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40">
          <button
            onClick={() => setShowCart(true)}
            className="max-w-screen-lg mx-auto w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-accent font-bold text-sm w-6 h-6 rounded flex items-center justify-center">
                {cartCount}
              </div>
              <span className="font-bold text-base">
                {formatCurrency(
                  cart.reduce(
                    (sum, item) => sum + item.itemTotal * item.quantity,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>View Cart</span>
              <span className="text-lg">›</span>
            </div>
          </button>
        </div>
      )}

      {/* Table Bill Modal */}
      {showBill && isTableOrder && restaurant && (
        <TableBill
          isOpen={showBill}
          onClose={() => setShowBill(false)}
          tableNumber={parseInt(tableId || '0')}
          restaurantId={restaurant.id}
          language={language}
        />
      )}
    </div>
  );
};

// Cart Modal Component
interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
  language: 'en' | 'th' | 'ru' | 'zh';
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  language,
}) => {
  const getItemName = (item: MenuItem): string => {
    if (typeof item.name === 'object') {
      return item.name[language] || item.name.en || 'Item';
    }
    return item.name || 'Item';
  };

  const total = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Cart" size="lg">
      <div className="space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-bg-subtle rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-text">{getItemName(item)}</h4>
                    {item.selectedProtein && (
                      <p className="text-sm text-text-secondary">
                        {item.selectedProtein === 'shrimp' ? '🍤 Shrimp' :
                          item.selectedProtein === 'squid' ? '🦑 Squid' :
                            item.selectedProtein === 'seafood' ? '🍤🦑 Seafood' :
                              item.selectedProtein === 'chicken' ? '🐔 Chicken' :
                                item.selectedProtein === 'pork' ? '🐷 Pork' : ''}
                      </p>
                    )}
                    {item.spicyLevel && item.spicyLevel !== 'none' && (
                      <p className="text-sm text-text-secondary">
                        {item.spicyLevel === 'little' ? '🌶️ Little Spicy' :
                          item.spicyLevel === 'medium' ? '🌶️🌶️ Medium Spicy' :
                            item.spicyLevel === 'very' ? '🌶️🌶️🌶️ Very Spicy' : ''}
                      </p>
                    )}
                    {item.biggerPortion && (
                      <p className="text-sm text-text-secondary">🍽️ Bigger Portion (+฿20)</p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        Add-ons:{" "}
                        {item.selectedAddons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className="text-accent font-semibold mt-1">
                      {formatCurrency(item.itemTotal)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 text-error hover:bg-error/10 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-xl font-bold text-text mb-4">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Item Customization Modal Component
interface ItemCustomizationModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, selectedProtein?: string, selectedPrice?: number, spicyLevel?: string, biggerPortion?: boolean, selectedAddons?: any[]) => void;
  language: 'en' | 'th' | 'ru' | 'zh';
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  isOpen,
  item,
  onClose,
  onAdd,
  language,
}) => {
  const [selectedProtein, setSelectedProtein] = useState<'shrimp' | 'squid' | 'seafood' | 'chicken' | 'pork' | null>(null);
  const [spicyLevel, setSpicyLevel] = useState<'none' | 'little' | 'medium' | 'very'>('none');
  const [biggerPortion, setBiggerPortion] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  useEffect(() => {
    if (item) {
      // Auto-select protein based on available prices
      if (item.price_seafood && item.price_seafood > 0 && !item.price_chicken_pork) {
        setSelectedProtein('seafood');
      } else if (item.price_chicken_pork && item.price_chicken_pork > 0 && !item.price_seafood) {
        setSelectedProtein('chicken');
      } else if (item.price_standard && item.price_standard > 0) {
        setSelectedProtein(null); // No protein selection needed
      }
    }
  }, [item]);

  if (!item) return null;

  const getItemName = (menuItem: MenuItem): string => {
    if (typeof menuItem.name === 'object') {
      return menuItem.name[language] || menuItem.name.en || 'Item';
    }
    return menuItem.name || 'Item';
  };

  const getItemDescription = (item: MenuItem): string | undefined => {
    if (!item.description) return undefined;
    if (typeof item.description === 'object') {
      return item.description[language] || item.description.en;
    }
    return item.description;
  };

  const toggleAddon = (addon: any) => {
    if (selectedAddons.find((a) => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const getSelectedPrice = (): number => {
    // If has standard price, use it
    if (item.price_standard && item.price_standard > 0) {
      return item.price_standard;
    }

    // If protein selected
    if (selectedProtein) {
      if (['shrimp', 'squid', 'seafood'].includes(selectedProtein)) {
        return item.price_seafood || 0;
      } else if (['chicken', 'pork'].includes(selectedProtein)) {
        return item.price_chicken_pork || 0;
      }
    }

    // Default to first available
    return item.price_seafood || item.price_chicken_pork || 0;
  };

  const calculateTotal = () => {
    const basePrice = getSelectedPrice();
    const portionExtra = cookedDish && biggerPortion ? 20 : 0;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    return (basePrice || 0) + portionExtra + addonsTotal;
  };

  const cookedDish = !["Beverage", "Dessert", "Add-ons"].includes(
    item.category || ""
  );
  const hasSeafoodPrice = item.price_seafood && item.price_seafood > 0;
  const hasChickenPorkPrice = item.price_chicken_pork && item.price_chicken_pork > 0;
  const hasStandardPrice = item.price_standard && item.price_standard > 0;
  const needsProteinSelection =
    cookedDish && (hasSeafoodPrice || hasChickenPorkPrice) && !hasStandardPrice;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getItemName(item)} size="md">
      <div className="space-y-6">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={getItemName(item)}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        {getItemDescription(item) && (
          <p className="text-text-secondary">{getItemDescription(item)}</p>
        )}

        {/* Protein Selection */}
        {needsProteinSelection && (
          <div>
            <h4 className="font-semibold text-text mb-3">
              {language === 'th' ? 'เลือกโปรตีน' : language === 'ru' ? 'Выберите белок' : language === 'zh' ? '选择蛋白质' : 'Select Protein'}
            </h4>
            <div className="space-y-2">
              {hasSeafoodPrice && (
                <>
                  <button
                    onClick={() => setSelectedProtein('shrimp')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${selectedProtein === 'shrimp'
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🍤</span>
                      <span>{language === 'th' ? 'กุ้ง' : language === 'ru' ? 'Креветки' : language === 'zh' ? '虾' : 'Shrimp'}</span>
                    </span>
                    <span className="font-semibold text-accent">{formatCurrency(item.price_seafood)}</span>
                  </button>

                  <button
                    onClick={() => setSelectedProtein('squid')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${selectedProtein === 'squid'
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🦑</span>
                      <span>{language === 'th' ? 'ปลาหมึก' : language === 'ru' ? 'Кальмары' : language === 'zh' ? '鱿鱼' : 'Squid'}</span>
                    </span>
                    <span className="font-semibold text-accent">{formatCurrency(item.price_seafood)}</span>
                  </button>

                  <button
                    onClick={() => setSelectedProtein('seafood')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${selectedProtein === 'seafood'
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🍤🦑</span>
                      <span>{language === 'th' ? 'ทะเล (กุ้ง+ปลาหมึก)' : language === 'ru' ? 'Морепродукты (креветки+кальмары)' : language === 'zh' ? '海鲜 (虾+鱿鱼)' : 'Seafood (Shrimp+Squid)'}</span>
                    </span>
                    <span className="font-semibold text-accent">{formatCurrency(item.price_seafood)}</span>
                  </button>
                </>
              )}

              {hasChickenPorkPrice && (
                <>
                  <button
                    onClick={() => setSelectedProtein('chicken')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${selectedProtein === 'chicken'
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🐔</span>
                      <span>{language === 'th' ? 'ไก่' : language === 'ru' ? 'Курица' : language === 'zh' ? '鸡肉' : 'Chicken'}</span>
                    </span>
                    <span className="font-semibold text-accent">{formatCurrency(item.price_chicken_pork)}</span>
                  </button>

                  <button
                    onClick={() => setSelectedProtein('pork')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${selectedProtein === 'pork'
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🐷</span>
                      <span>{language === 'th' ? 'หมู' : language === 'ru' ? 'Свинина' : language === 'zh' ? '猪肉' : 'Pork'}</span>
                    </span>
                    <span className="font-semibold text-accent">{formatCurrency(item.price_chicken_pork)}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {cookedDish && (
          <>
            {/* Spicy Level */}
            <div>
              <h4 className="font-semibold text-text mb-3">
                {language === 'th' ? 'ระดับความเผ็ด' : language === 'ru' ? 'Уровень остроты' : language === 'zh' ? '辣度' : 'Spicy Level'}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(['none', 'little', 'medium', 'very'] as const).map((level) => {
                  const labels = {
                    none: { en: 'No Spicy', th: 'ไม่เผ็ด', ru: 'Не острое', zh: '不辣', icon: '😊' },
                    little: { en: 'Little Spicy', th: 'เผ็ดน้อย', ru: 'Немного острое', zh: '微辣', icon: '🌶️' },
                    medium: { en: 'Medium Spicy', th: 'เผ็ดปานกลาง', ru: 'Средне острое', zh: '中辣', icon: '🌶️🌶️' },
                    very: { en: 'Very Spicy', th: 'เผ็ดมาก', ru: 'Очень острое', zh: '很辣', icon: '🌶️🌶️🌶️' },
                  };

                  return (
                    <button
                      key={level}
                      onClick={() => setSpicyLevel(level)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${spicyLevel === level
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <span>{labels[level].icon}</span>
                      <span className="text-sm">{labels[level][language]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bigger Portion */}
            <div>
              <button
                onClick={() => setBiggerPortion(!biggerPortion)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${biggerPortion
                  ? 'border-accent bg-accent/10'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span>🍽️</span>
                  <span className="font-semibold">
                    {language === 'th' ? 'เพิ่มขนาดใหญ่ขึ้น' : language === 'ru' ? 'Большая порция' : language === 'zh' ? '加大份量' : 'Bigger Portion'}
                  </span>
                </span>
                <span className="font-semibold text-accent">+฿20</span>
              </button>
            </div>
          </>
        )}

        {/* Addons */}
        {item.addons && item.addons.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">Add-ons (Optional)</h4>
            <div className="space-y-2">
              {item.addons.map((addon) => (
                <button
                  key={addon.name}
                  onClick={() => toggleAddon(addon)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${selectedAddons.find((a) => a.name === addon.name)
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                    }`}
                >
                  <span className="font-medium text-text">{addon.name}</span>
                  <span className="text-accent font-semibold">
                    +{formatCurrency(addon.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-xl font-bold text-text mb-4">
            <span>Total</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
          <Button
            onClick={() => {
              if (needsProteinSelection && !selectedProtein) {
                alert(language === 'th' ? 'กรุณาเลือกโปรตีน' : language === 'ru' ? 'Пожалуйста, выберите белок' : language === 'zh' ? '请选择蛋白质' : 'Please select a protein');
                return;
              }
              onAdd(
                item,
                selectedProtein || undefined,
                getSelectedPrice(),
                cookedDish ? spicyLevel : 'none',
                cookedDish ? biggerPortion : false,
                selectedAddons
              );
            }}
            fullWidth
            size="lg"
          >
            {language === 'th' ? 'เพิ่มลงตะกร้า' : language === 'ru' ? 'Добавить в корзину' : language === 'zh' ? '加入购物车' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Checkout Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  restaurantId: string;
  tableId: string;
  sessionId: string;
  isTableOrder: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  setCart,
  restaurantId,
  tableId,
  sessionId,
  isTableOrder,
  onClose,
  onSuccess,
}) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const getItemName = (menuItem: MenuItem): string => {
    if (typeof menuItem.name === 'object') {
      return menuItem.name.en || menuItem.name.th || Object.values(menuItem.name)[0] as string || 'Item';
    }
    return menuItem.name || 'Item';
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const total = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setLoading(true);

    // Create one order per cart item
    let hasError = false;
    for (const item of cart) {
      const itemSubtotal = item.itemTotal * item.quantity;
      const orderData = {
        restaurant_id: restaurantId,
        order_type: (isTableOrder ? "qr" : "counter") as
          | "qr"
          | "counter",
        table_number: isTableOrder ? tableId : undefined,
        session_id: isTableOrder ? sessionId : undefined,
        is_paid: false,
        items: [{
          menu_item_id: item.id,
          name: getItemName(item),
          quantity: item.quantity,
          selected_price: item.selectedPrice,
          price_type: (item.selectedProtein
            ? (['shrimp', 'squid', 'seafood'].includes(item.selectedProtein)
              ? 'seafood'
              : 'chicken_pork')
            : 'standard') as 'standard' | 'seafood' | 'chicken_pork',
          selected_size: item.selectedProtein ? { name: item.selectedProtein, price: item.selectedPrice } : undefined,
          selected_addons: item.selectedAddons,
          item_total: item.itemTotal,
          special_instructions: item.spicyLevel && item.spicyLevel !== 'none' ? `Spicy: ${item.spicyLevel}${item.biggerPortion ? ', Bigger portion' : ''}` : (item.biggerPortion ? 'Bigger portion' : undefined),
        }],
        subtotal: itemSubtotal,
        tax: 0,
        total: itemSubtotal,
        customer_notes: notes,
      };

      const { error: orderError } = await createOrder(orderData);
      if (orderError) {
        hasError = true;
        setError(orderError?.message || "Failed to place order");
        break;
      }
    }

    setLoading(false);

    if (!hasError) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        resetForm();
      }, 2000);
    }
  };

  const resetForm = () => {
    setCart([]);
    setNotes("");
    setSuccess(false);
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Order Placed!" size="md">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-text mb-2">
            Order Successful!
          </h3>
          <p className="text-text-secondary mb-6">
            Your order has been placed successfully. The restaurant will prepare
            it shortly.
          </p>
          <Button onClick={onClose} fullWidth>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isTableOrder ? `Checkout - Table ${tableId}` : "Checkout - Takeaway"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Order Type Info */}
        <div className="bg-accent/10 border border-accent rounded-lg p-4">
          <p className="text-sm text-text-secondary">Order Type</p>
          <p className="text-lg font-semibold text-accent">
            {isTableOrder ? `Dine In - Table ${tableId}` : "Takeaway / Parcel"}
          </p>
        </div>

        {/* Special Instructions */}
        <div>
          <label className="label mb-2">Special Instructions (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests for your order..."
            rows={3}
            className="input-field"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">Order Summary</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {getItemName(item)}
                {item.selectedProtein && ` (${item.selectedProtein})`}
                {item.spicyLevel && item.spicyLevel !== 'none' && ` 🌶️`}
                {item.biggerPortion && ` 🍽️`}
              </span>
              <span className="text-text">
                {formatCurrency(item.itemTotal * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xl font-bold text-text">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Place Order
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
