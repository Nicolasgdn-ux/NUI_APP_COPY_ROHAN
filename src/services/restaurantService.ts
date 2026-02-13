import { supabase } from "../config/supabase";
import type { Order, MenuItem } from "../config/supabase";

/**
 * Restaurant API Service
 * All restaurant dashboard operations with real-time support
 */

// Subscribe to restaurant's orders with real-time updates
export const subscribeToOrders = (
  restaurantId: string,
  callback: (orders: Order[]) => void
) => {
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchOrders();

  const subscription = supabase
    .channel(`restaurant-orders-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchOrders();
      }
    )
    .subscribe();

  return subscription;
};

// Subscribe to unpaid orders for a specific table
export const subscribeToTableOrders = (
  restaurantId: string,
  tableNumber: string,
  callback: (orders: Order[]) => void
) => {
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("table_number", tableNumber)
      .eq("is_paid", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchOrders();

  const subscription = supabase
    .channel(`restaurant-table-orders-${restaurantId}-${tableNumber}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchOrders();
      }
    )
    .subscribe();

  return subscription;
};

// Mark all orders for a table as paid
export const markTablePaid = async (
  restaurantId: string,
  tableNumber: string
) => {
  const { error } = await supabase
    .from("orders")
    .update({ is_paid: true })
    .eq("restaurant_id", restaurantId)
    .eq("table_number", tableNumber)
    .eq("is_paid", false)
    .eq("status", "completed");

  return !error;
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  paymentData?: {
    paymentMethod?: string;
    transactionId?: string;
  },
  extraUpdates?: Record<string, any>
) => {
  const updateData: any = { status, ...(extraUpdates || {}) };

  if (paymentData) {
    updateData.payment_method = paymentData.paymentMethod;
    updateData.payment_transaction_id = paymentData.transactionId;
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  return !error;
};

// Delete order
export const deleteOrder = async (orderId: string) => {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  return !error;
};

// Update order fields (items, totals, status, etc.)
export const updateOrderFields = async (
  orderId: string,
  updates: Partial<Order>
) => {
  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId);

  return { success: !error, error };
};

// Normalize MenuItem data from Supabase (prices may be strings, ensure they're numbers)
const normalizeMenuItems = (items: any[]): MenuItem[] => {
  return items.map(item => ({
    ...item,
    price_standard: item.price_standard ? parseFloat(item.price_standard) : undefined,
    price_seafood: item.price_seafood ? parseFloat(item.price_seafood) : undefined,
    price_chicken_pork: item.price_chicken_pork ? parseFloat(item.price_chicken_pork) : undefined,
  }));
};

// Subscribe to menu items with real-time updates
export const subscribeToMenuItems = (
  restaurantId: string,
  callback: (items: MenuItem[]) => void
) => {
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      // some projects don't have a `created_at` column on menu_items
      // ordering by `id` (UUID) is a safe default to provide stable ordering
      .order("id", { ascending: false });

    if (!error && data) {
      callback(normalizeMenuItems(data));
    }
  };

  fetchItems();

  const subscription = supabase
    .channel(`restaurant-menu-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchItems();
      }
    )
    .subscribe();

  return subscription;
};

// Create menu item
export const createMenuItem = async (item: Partial<MenuItem>) => {
  const { error } = await supabase
    .from("menu_items")
    .insert([item])
    .select()
    .single();

  return !error;
};

// Update menu item
export const updateMenuItem = async (
  itemId: string,
  updates: Partial<MenuItem>
) => {
  const { error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", itemId);

  return !error;
};

// Toggle menu item availability (triggers real-time update for customers)
export const toggleMenuItemAvailability = async (
  itemId: string,
  isAvailable: boolean
) => {
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);

  return !error;
};

// Delete menu item
export const deleteMenuItem = async (itemId: string) => {
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

  return !error;
};

// Create order (manual or from customer)
export const createOrder = async (order: Partial<Order>) => {
  const { data, error } = await supabase
    .from("orders")
    .insert([order])
    .select()
    .single();

  return { data, error };
};

// Get restaurant stats
export const getRestaurantStats = async (restaurantId: string) => {
  try {
    // Get start of today in Bangkok timezone (UTC+7)
    // Supabase stores timestamps in UTC, so we need to adjust
    const now = new Date();
    const bangkokNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

    // Start of day in Bangkok
    const startOfDayBangkok = new Date(bangkokNow);
    startOfDayBangkok.setHours(0, 0, 0, 0);

    // Convert back to UTC for Supabase query
    const startOfDayUTC = new Date(startOfDayBangkok.getTime() - (7 * 60 * 60 * 1000));

    const [
      { data: todayOrders },
      { data: pendingOrders },
      { count: totalOrders },
      { count: totalMenuItems },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startOfDayUTC.toISOString()),
      supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
      supabase
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
    ]);

    const todayOrdersCount = todayOrders?.length || 0;
    const completedToday =
      todayOrders?.filter((o) => o.status === "completed").length || 0;
    const todayRevenue =
      todayOrders
        ?.reduce((sum, o) => sum + (parseFloat(o.total as any) || 0), 0) || 0;

    return {
      pendingOrders: pendingOrders?.length || 0,
      todayOrders: todayOrdersCount,
      completedToday,
      todayRevenue,
      totalOrders: totalOrders || 0,
      totalMenuItems: totalMenuItems || 0,
    };
  } catch (error) {
    console.error("Error fetching restaurant stats:", error);
    return {
      pendingOrders: 0,
      todayOrders: 0,
      completedToday: 0,
      todayRevenue: 0,
      totalOrders: 0,
      totalMenuItems: 0,
    };
  }
};

// Mark all orders for a specific session as paid
export const markSessionPaid = async (
  restaurantId: string,
  sessionId: string
) => {
  const { error } = await supabase
    .from("orders")
    .update({ is_paid: true })
    .eq("restaurant_id", restaurantId)
    .eq("session_id", sessionId);

  return { success: !error, error };
};

// Mark all orders for a specific table as paid
export const markAllTablePaid = async (
  restaurantId: string,
  tableNumber: string
) => {
  const { error } = await supabase
    .from("orders")
    .update({ is_paid: true })
    .eq("restaurant_id", restaurantId)
    .eq("table_number", tableNumber);

  return { success: !error, error };
};
