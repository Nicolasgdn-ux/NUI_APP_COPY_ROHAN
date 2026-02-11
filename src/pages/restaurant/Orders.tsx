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
  updateOrderStatus,
  deleteOrder,
} from "../../services/restaurantService";
import type { Order } from "../../config/supabase";
import { formatDateTime, formatCurrency, playSound } from "../../utils/helpers";

const Orders: React.FC = () => {
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

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: string,
    extraUpdates?: Record<string, any>
  ) => {
    const success = await updateOrderStatus(orderId, newStatus, undefined, extraUpdates);
    if (!success) {
      alert("Failed to update order status");
      return;
    }

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus as Order["status"] }
          : order
      )
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
    return <Loading text="Loading orders..." />;
  }

  const pendingCount = orders.filter(
    (o) => o.status === "pending" || o.status === "accepted"
  ).length;
  const pendingItems = filteredOrders.flatMap((order) =>
    (order.items || []).map((item: any, index: number) => ({
      order,
      item,
      index,
    }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Orders</h2>
          <p className="text-text-secondary">
            Manage and track customer orders in real-time
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-lg px-4 py-2 animate-pulse">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Live order updates • Sound notifications enabled</span>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {["pending", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === status
              ? "bg-accent text-white"
              : "bg-bg-subtle text-text-secondary hover:bg-border"
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === "pending" && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No Orders Found
          </h3>
          <p className="text-text-secondary">
            No {statusFilter} orders at the moment.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {statusFilter === "pending"
            ? pendingItems.map(({ order, item, index }) => (
              <Card
                key={`${order.id}-${index}`}
                className="hover:shadow-lg transition-shadow border-l-4 border-l-warning"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <h3 className="text-lg font-bold text-text">
                            Order #{order.order_number}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.is_paid && <Badge variant="success">Paid</Badge>}
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Package className="w-4 h-4" />
                        <span>
                          {order.order_type} •{" "}
                          {order.table_number && `Table ${order.table_number}`}
                          {!order.table_number && "Takeaway"}
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
                        <span className="font-semibold text-text">1 item</span>
                        <span>•</span>
                        <span className="font-bold text-text text-lg">
                          {formatCurrency(item.item_total || item.subtotal || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium text-text">
                        {item.quantity}x {item.name}
                      </p>
                      {item.selected_size?.name && (
                        <p className="text-text-secondary">Protein: {item.selected_size.name}</p>
                      )}
                      {item.selected_addons && item.selected_addons.length > 0 && (
                        <p className="text-text-secondary">
                          Add-ons: {item.selected_addons.map((a: any) => a.name).join(", ")}
                        </p>
                      )}
                      {item.special_instructions && (
                        <p className="text-text-secondary">Notes: {item.special_instructions}</p>
                      )}
                    </div>

                    {order.customer_notes && (
                      <div className="flex items-start space-x-2 text-sm bg-bg-subtle rounded-lg p-3">
                        <MessageSquare className="w-4 h-4 text-accent-secondary mt-0.5" />
                        <div>
                          <p className="font-medium text-text">Customer Notes:</p>
                          <p className="text-text-secondary">
                            {order.customer_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => handleStatusUpdate(order.id, "completed")}
                    >
                      Finished
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
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            ))
            : filteredOrders.map((order) => (
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
                            Order #{order.order_number}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.is_paid && (
                          <Badge variant="success">Paid</Badge>
                        )}
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Package className="w-4 h-4" />
                        <span>
                          {order.order_type} •{" "}
                          {order.table_number && `Table ${order.table_number}`}
                          {!order.table_number && "Takeaway"}
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
                        <span className="font-semibold text-text">
                          {order.items?.length || 0} items
                        </span>
                        <span>•</span>
                        <span className="font-bold text-text text-lg">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="text-sm text-text-secondary">
                        <span className="font-medium text-text">Items:</span>{" "}
                        {order.items
                          .slice(0, 3)
                          .map((item: any) => `${item.quantity}x ${item.name}`)
                          .join(" • ")}
                        {order.items.length > 3 && " • ..."}
                      </div>
                    )}

                    {order.customer_notes && (
                      <div className="flex items-start space-x-2 text-sm bg-bg-subtle rounded-lg p-3">
                        <MessageSquare className="w-4 h-4 text-accent-secondary mt-0.5" />
                        <div>
                          <p className="font-medium text-text">Customer Notes:</p>
                          <p className="text-text-secondary">
                            {order.customer_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                    {order.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    {order.status === "cancelled" && (
                      <Button variant="outline" size="sm" fullWidth disabled>
                        Cancelled
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
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
