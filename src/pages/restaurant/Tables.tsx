import React, { useEffect, useState } from "react";
import { CheckCircle, Table as TableIcon, Receipt } from "lucide-react";
import { Card, Button, Loading, Badge } from "../../components/ui";
import { subscribeToOrders, markTablePaid, markSessionPaid, markAllTablePaid } from "../../services/restaurantService";
import type { Order } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { TableBill } from "../../components/TableBill";

interface TablesProps {
    language?: 'en' | 'th';
}

const Tables: React.FC<TablesProps> = ({ language = 'en' }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [restaurantId, setRestaurantId] = useState<string>("");

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user.restaurant_id) return;

        setRestaurantId(user.restaurant_id);

        const subscription = subscribeToOrders(user.restaurant_id, (data) => {
            setOrders(data);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const unpaidOrders = orders.filter(
        (order) => order.table_number && order.is_paid !== true
    );

    const tableTotals: Record<string, { total: number; count: number; allCompleted: boolean }> = {};
    unpaidOrders.forEach((order) => {
        const table = order.table_number as string;
        if (!tableTotals[table]) {
            tableTotals[table] = { total: 0, count: 0, allCompleted: true };
        }
        tableTotals[table].total += order.total || 0;
        tableTotals[table].count += 1;
        if (order.status !== "completed") {
            tableTotals[table].allCompleted = false;
        }
    });

    const handlePaid = async (tableNumber: string) => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user.restaurant_id) return;
        const success = await markTablePaid(user.restaurant_id, tableNumber);
        if (!success) {
            alert("Failed to mark table as paid");
            return;
        }

        // Optimistically update local state so totals reset immediately
        setOrders((prev) =>
            prev.map((order) =>
                order.table_number === tableNumber
                    ? { ...order, is_paid: true }
                    : order
            )
        );
    };

    const handlePaySession = async (sessionId: string) => {
        if (!restaurantId) return;

        const result = await markSessionPaid(restaurantId, sessionId);
        if (!result.success) {
            alert("Failed to mark session as paid");
            return;
        }

        // Optimistically update local state
        setOrders((prev) =>
            prev.map((order) =>
                order.session_id === sessionId
                    ? { ...order, is_paid: true }
                    : order
            )
        );
    };

    const handleAllTablePaid = async (tableNumber: string) => {
        if (!restaurantId) return;

        const result = await markAllTablePaid(restaurantId, tableNumber);
        if (!result.success) {
            alert("Failed to mark all table orders as paid");
            return;
        }

        // Optimistically update local state
        setOrders((prev) =>
            prev.map((order) =>
                order.table_number === tableNumber
                    ? { ...order, is_paid: true }
                    : order
            )
        );
    };

    if (loading) {
        return <Loading text={language === 'th' ? 'กำลังโหลดโต๊ะ...' : 'Loading tables...'} />;
    }

    const tables = Array.from({ length: 50 }, (_, i) => String(i + 1));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-text mb-2">
                    {language === 'th' ? 'โต๊ะ' : 'Tables'}
                </h2>
                <p className="text-text-secondary">
                    {language === 'th'
                        ? 'ติดตามยอดที่ยังไม่ได้จ่ายตามโต๊ะ และทำเครื่องหมายว่าจ่ายแล้ว'
                        : 'Track unpaid totals by table and mark them as paid.'}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => {
                    const data = tableTotals[table];
                    const total = data?.total || 0;
                    const count = data?.count || 0;
                    const hasOrders = total > 0;
                    const allCompleted = data?.allCompleted ?? false;
                    const canPay = hasOrders && allCompleted;

                    return (
                        <Card key={table} className="p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TableIcon className="w-5 h-5 text-accent" />
                                    <span className="font-semibold text-text">
                                        {language === 'th' ? 'โต๊ะ' : 'Table'} {table}
                                    </span>
                                </div>
                                {hasOrders && (
                                    <Badge variant="warning">
                                        {count} {language === 'th' ? 'รายการ' : 'orders'}
                                    </Badge>
                                )}
                            </div>

                            <div className="text-lg font-bold text-text">
                                {formatCurrency(total)}
                            </div>

                            <div className="flex gap-2 flex-col">
                                {hasOrders && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedTable(parseInt(table))}
                                        icon={<Receipt className="w-4 h-4" />}
                                        fullWidth
                                    >
                                        {language === 'th' ? 'ดูบิล' : 'View Bill'}
                                    </Button>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        variant={canPay ? "primary" : "ghost"}
                                        size="sm"
                                        onClick={() => handlePaid(table)}
                                        disabled={!canPay}
                                        icon={<CheckCircle className="w-4 h-4" />}
                                        fullWidth
                                    >
                                        {canPay
                                            ? (language === 'th' ? 'จ่ายแล้ว' : 'Already Paid')
                                            : (language === 'th' ? 'ต้องทำเสร็จก่อน' : 'Complete orders first')}
                                    </Button>
                                    {hasOrders && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleAllTablePaid(table)}
                                            fullWidth
                                        >
                                            {language === 'th' ? 'ล้าง' : 'All Paid'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {selectedTable && (
                <TableBill
                    isOpen={true}
                    onClose={() => setSelectedTable(null)}
                    tableNumber={selectedTable}
                    restaurantId={restaurantId}
                    onPaySession={handlePaySession}
                    language={language === 'th' ? 'th' : 'en'}
                />
            )}
        </div>
    );
};

export default Tables;
