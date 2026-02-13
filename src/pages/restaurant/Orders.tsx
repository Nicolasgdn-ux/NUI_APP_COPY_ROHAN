import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToOrders,
  deleteOrder,
  updateOrderFields,
} from "../../services/restaurantService";
import type { Order } from "../../config/supabase";
import { formatDateTime, formatCurrency, playSound } from "../../utils/helpers";

interface OrdersProps {
  language?: 'en' | 'th';
}

const Orders: React.FC<OrdersProps> = ({ language = 'en' }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const prevOrderCountRef = useRef(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToOrders(user.restaurant_id, (data) => {
      // Play sound if new order arrived
      if (data.length > prevOrderCountRef.current) {
        const newOrders = data.filter(
          (order) =>
            order.status === "pending" && !orders.find((o) => o.id === order.id)
        );
        if (newOrders.length > 0) {
          playSound("notification");
        }
      }
      prevOrderCountRef.current = data.length;
      setOrders(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredOrders = orders
    .filter((order) =>
      statusFilter === "pending"
        ? order.status === "pending" || order.status === "accepted"
        : order.status === statusFilter
    )
    .sort((a, b) => {
      // Oldest first (FIFO)
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });


  const handleFinishOrder = async (order: Order) => {
    const updates: Partial<Order> = {
      status: "completed",
    };

    const result = await updateOrderFields(order.id, updates);
    if (!result.success) {
      alert("Failed to mark order as finished");
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, ...updates } : o))
    );
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status === "accepted" ? "pending" : status;
    const variants: Record<string, any> = {
      pending: "warning",
      completed: "success",
      cancelled: "neutral",
      rejected: "error",
    };
    return (
      <Badge variant={variants[normalizedStatus] || "neutral"}>
        {normalizedStatus}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status === "accepted" ? "pending" : status;
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return normalizedStatus === "pending" ? (
          <Clock className="w-5 h-5 text-warning" />
        ) : (
          <Clock className="w-5 h-5 text-text-secondary" />
        );
    }
  };

  if (loading) {
    return <Loading text={language === 'th' ? 'กำลังโหลดคำสั่งซื้อ...' : 'Loading orders...'} />;
  }

  // Translation strings
  const t = {
    en: {
      orders: 'Orders',
      pendingOrders: 'Pending Orders',
      allOrders: 'All Orders',
      noOrders: 'No orders found',
      orderId: 'Order ID',
      table: 'Table',
      status: 'Status',
      items: 'Items',
      total: 'Total',
      actions: 'Actions',
      viewDetails: 'View Details',
      markFinished: 'Mark Completed',
      finish: 'Completed',
      reject: 'Reject',
      paid: 'Paid',
      protein: 'Protein',
      addOns: 'Add-ons',
      notes: 'Notes',
      orderTable: 'Order Table',
      takeaway: 'Takeaway',
      rejectOrder: 'Reject Order',
      reason: 'Reason (optional)',
      cancel: 'Cancel',
      confirm: 'Confirm',
      accepted: 'Accepted',
      pending: 'Pending',
      completed: 'Completed',
      cancelled: 'Cancelled',
      customerNotes: 'Customer Notes',
    },
    th: {
      orders: 'คำสั่งซื้อ',
      pendingOrders: 'คำสั่งซื้อที่รอดำเนินการ',
      allOrders: 'คำสั่งซื้อทั้งหมด',
      noOrders: 'ไม่พบคำสั่งซื้อ',
      orderId: 'หมายเลขคำสั่งซื้อ',
      table: 'โต๊ะ',
      status: 'สถานะ',
      items: 'รายการ',
      total: 'รวม',
      actions: 'การกระทำ',
      viewDetails: 'ดูรายละเอียด',
      markFinished: 'ทำเสร็จแล้ว',
      finish: 'ทำเสร็จแล้ว',
      reject: 'ปฏิเสธ',
      paid: 'ชำระแล้ว',
      protein: 'โปรตีน',
      addOns: 'เพิ่มเติม',
      notes: 'หมายเหตุ',
      orderTable: 'คำสั่งซื้อโต๊ะ',
      takeaway: 'ทำการสั่ง',
      rejectOrder: 'ปฏิเสธคำสั่งซื้อ',
      reason: 'เหตุผล (ไม่บังคับ)',
      cancel: 'ยกเลิก',
      confirm: 'ยืนยัน',
      accepted: 'ยอมรับแล้ว',
      pending: 'รอดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      customerNotes: 'หมายเหตุของลูกค้า',
    }
  };

  const translations = t[language as keyof typeof t];

  const pendingCount = orders.filter(
    (o) => o.status === "pending" || o.status === "accepted"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">{translations.orders}</h2>
          <p className="text-text-secondary">
            {language === 'th' ? 'จัดการและติดตามคำสั่งซื้อลูกค้าแบบเรียลไทม์' : 'Manage and track customer orders in real-time'}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-lg px-4 py-2 animate-pulse">
            {pendingCount} {translations.pending}
          </Badge>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>{language === 'th' ? 'อัปเดตคำสั่งซื้อสดวิทยุ • เปิดใช้งานการแจ้งเตือนเสียง' : 'Live order updates • Sound notifications enabled'}</span>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {["pending", "completed", "cancelled"].map((status) => {
          const statusLabel = status === 'pending' ? (language === 'th' ? 'รอดำเนินการ' : 'Pending')
            : status === 'completed' ? (language === 'th' ? 'เสร็จสิ้น' : 'Completed')
              : (language === 'th' ? 'ยกเลิก' : 'Cancelled');
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === status
                ? "bg-accent text-white"
                : "bg-bg-subtle text-text-secondary hover:bg-border"
                }`}
            >
              {statusLabel}
              {status === "pending" && ` (${pendingCount})`}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            {translations.noOrders}
          </h3>
          <p className="text-text-secondary">
            {language === 'th'
              ? statusFilter === 'pending' ? 'ไม่มีคำสั่งซื้อที่รอดำเนินการในตอนนี้'
                : statusFilter === 'completed' ? 'ไม่มีคำสั่งซื้อที่เสร็จสิ้นในตอนนี้'
                  : 'ไม่มีคำสั่งซื้อที่ยกเลิกในตอนนี้'
              : `No ${statusFilter} orders at the moment.`}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => {
            const item = order.items?.[0]; // Since we now create one order per item
            return (
              <Card
                key={order.id}
                className={`hover:shadow-lg transition-shadow ${order.status === "pending" ? "border-l-4 border-l-warning" : ""
                  }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <h3 className="text-lg font-bold text-text">
                            Order Table {order.table_number || order.order_number}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.is_paid && <Badge variant="success">{t[language].paid}</Badge>}
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Package className="w-4 h-4" />
                        <span>
                          {order.order_type} •{" "}
                          {order.table_number && `${t[language].table} ${order.table_number}`}
                          {!order.table_number && t[language].takeaway}
                        </span>
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center space-x-2 text-text-secondary">
                          <Phone className="w-4 h-4" />
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="text-accent hover:underline"
                          >
                            {order.customer_phone}
                          </a>
                        </div>
                      )}
                      {order.customer_name && (
                        <div className="flex items-center space-x-2 text-text-secondary">
                          <User className="w-4 h-4" />
                          <span>{order.customer_name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <span className="font-semibold text-text">{t[language].items} 1</span>
                        <span>•</span>
                        <span className="font-bold text-text text-lg">
                          {formatCurrency(order.total || 0)}
                        </span>
                      </div>
                    </div>

                    {item && (
                      <div className="text-sm">
                        <p className="font-medium text-text">
                          {item.quantity}x {item.name}
                        </p>
                        {item.selected_size?.name && (
                          <p className="text-text-secondary">{t[language].protein}: {item.selected_size.name}</p>
                        )}
                        {item.selected_addons && item.selected_addons.length > 0 && (
                          <p className="text-text-secondary">
                            {t[language].addOns}: {item.selected_addons.map((a: any) => a.name).join(", ")}
                          </p>
                        )}
                        {item.special_instructions && (
                          <p className="text-text-secondary">{t[language].notes}: {item.special_instructions}</p>
                        )}
                      </div>
                    )}

                    {order.customer_notes && (
                      <div className="flex items-start space-x-2 text-sm bg-bg-subtle rounded-lg p-3">
                        <MessageSquare className="w-4 h-4 text-accent-secondary mt-0.5" />
                        <div>
                          <p className="font-medium text-text">{t[language].customerNotes}:</p>
                          <p className="text-text-secondary">
                            {order.customer_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {statusFilter === "pending" && (
                    <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => handleFinishOrder(order)}
                      >
                        {t[language].finish}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        {t[language].cancel}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <RejectOrderModal
        isOpen={showRejectModal}
        order={selectedOrder}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedOrder(null);
        }}
        onReject={async (orderId) => {
          const success = await deleteOrder(orderId);
          if (!success) {
            alert("Failed to delete order");
          }
        }}
      />
    </div>
  );
};

// Cancel Order Modal Component
interface RejectOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onReject: (orderId: string) => void;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onReject,
}) => {
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    if (!order) return;
    onReject(order.id);
    onClose();
    setReason("");
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Order" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message="Are you sure you want to cancel this order? This action cannot be undone."
        />

        <Textarea
          label="Reason for Cancellation (Optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="E.g., Out of stock, Kitchen closed, Customer requested, etc."
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Back
          </Button>
          <Button variant="danger" onClick={handleCancel} fullWidth>
            Cancel Order
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Orders;
