import { useEffect, useState } from 'react';
import { X, Receipt, UserCircle, Loader2 } from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../utils/helpers';
import { Button } from './ui/Button';
import { Loading } from './ui/Loading';

interface Order {
    id: string;
    session_id: string | null;
    items: any[];
    subtotal: number;
    created_at: string;
    is_paid: boolean;
    status: string;
}

interface SessionGroup {
    session_id: string | null;
    orders: Order[];
    total: number;
    isPaid: boolean;
}

interface TableBillProps {
    isOpen: boolean;
    onClose: () => void;
    tableNumber: number;
    restaurantId: string;
    onPaySession?: (sessionId: string) => Promise<void>;
    language?: 'en' | 'th' | 'ru' | 'zh';
}

const translations = {
    en: {
        title: 'Table Bill',
        table: 'Table',
        session: 'Session',
        noSession: 'No Session',
        items: 'Items',
        status: 'Status',
        paid: 'Paid',
        unpaid: 'Unpaid',
        subtotal: 'Subtotal',
        tableTotal: 'Table Total',
        paySession: 'Pay Session',
        allPaid: 'All Paid',
        close: 'Close',
        loading: 'Loading bill...',
    },
    th: {
        title: 'ใบเสร็จโต๊ะ',
        table: 'โต๊ะ',
        session: 'เซสชัน',
        noSession: 'ไม่มีเซสชัน',
        items: 'รายการ',
        status: 'สถานะ',
        paid: 'จ่ายแล้ว',
        unpaid: 'ยังไม่จ่าย',
        subtotal: 'ยอดรวม',
        tableTotal: 'ยอดรวมโต๊ะ',
        paySession: 'จ่ายเซสชัน',
        allPaid: 'จ่ายครบแล้ว',
        close: 'ปิด',
        loading: 'กำลังโหลดใบเสร็จ...',
    },
    ru: {
        title: 'Счёт стола',
        table: 'Стол',
        session: 'Сессия',
        noSession: 'Без сессии',
        items: 'Позиции',
        status: 'Статус',
        paid: 'Оплачено',
        unpaid: 'Не оплачено',
        subtotal: 'Промежуточный итог',
        tableTotal: 'Итого по столу',
        paySession: 'Оплатить сессию',
        allPaid: 'Все оплачено',
        close: 'Закрыть',
        loading: 'Загрузка счёта...',
    },
    zh: {
        title: '桌号账单',
        table: '桌号',
        session: '会话',
        noSession: '无会话',
        items: '项目',
        status: '状态',
        paid: '已支付',
        unpaid: '未支付',
        subtotal: '小计',
        tableTotal: '总计',
        paySession: '支付会话',
        allPaid: '全部已支付',
        close: '关闭',
        loading: '正在加载账单...',
    }
};

export function TableBill({
    isOpen,
    onClose,
    tableNumber,
    restaurantId,
    onPaySession,
    language = 'en'
}: TableBillProps) {
    const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingSession, setPayingSession] = useState<string | null>(null);

    const t = translations[language];

    useEffect(() => {
        if (isOpen) {
            loadBill();
        }
    }, [isOpen, tableNumber, restaurantId]);

    const loadBill = async () => {
        setLoading(true);
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('table_number', tableNumber)
                .eq('is_paid', false)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Group orders by session_id
            const grouped = new Map<string, Order[]>();

            orders?.forEach((order) => {
                const key = order.session_id || 'no-session';
                if (!grouped.has(key)) {
                    grouped.set(key, []);
                }
                grouped.get(key)!.push(order);
            });

            // Convert to array with totals
            const groups: SessionGroup[] = Array.from(grouped.entries()).map(([sessionId, orders]) => ({
                session_id: sessionId === 'no-session' ? null : sessionId,
                orders,
                total: orders.reduce((sum, order) => sum + (order.subtotal || 0), 0),
                isPaid: orders.every(order => order.is_paid)
            }));

            setSessionGroups(groups);
        } catch (error) {
            console.error('Error loading bill:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePaySession = async (sessionId: string | null) => {
        if (!onPaySession || !sessionId) return;

        setPayingSession(sessionId);
        try {
            await onPaySession(sessionId);
            await loadBill(); // Reload to get updated data
        } catch (error) {
            console.error('Error paying session:', error);
        } finally {
            setPayingSession(null);
        }
    };

    const tableTotal = sessionGroups.reduce((sum, group) => sum + group.total, 0);
    const allPaid = sessionGroups.every(group => group.isPaid);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <Receipt className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold text-text">{t.title} - {t.table} {tableNumber}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loading text={t.loading} />
                        </div>
                    ) : sessionGroups.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            No orders found for this table
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sessionGroups.map((group, index) => (
                                <div
                                    key={group.session_id || `no-session-${index}`}
                                    className={`border rounded-lg p-4 ${group.isPaid
                                        ? 'border-success bg-success bg-opacity-5'
                                        : 'border-gray-700 bg-gray-900 bg-opacity-30'
                                        }`}
                                >
                                    {/* Session Header */}
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <UserCircle className="w-5 h-5 text-primary" />
                                            <span className="font-semibold text-text">
                                                {t.session} {index + 1} {!group.session_id && `(${t.noSession})`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm font-medium ${group.isPaid ? 'text-success' : 'text-warning'
                                                }`}>
                                                {group.isPaid ? t.paid : t.unpaid}
                                            </span>
                                            {!group.isPaid && onPaySession && group.session_id && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handlePaySession(group.session_id)}
                                                    disabled={payingSession === group.session_id}
                                                >
                                                    {payingSession === group.session_id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        t.paySession
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Orders in this session */}
                                    <div className="space-y-2 mb-3">
                                        {group.orders.map((order) => (
                                            <div key={order.id} className="flex justify-between items-start text-sm">
                                                <div className="flex-1">
                                                    {order.items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-text-secondary">
                                                            <span className="text-text font-medium">{item.quantity}x</span> {item.name}
                                                            {item.selected_size && (
                                                                <span className="text-xs ml-2">({item.selected_size.name})</span>
                                                            )}
                                                            {item.special_instructions && (
                                                                <div className="text-xs text-text-secondary ml-4">
                                                                    {item.special_instructions}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {order.status === 'completed' && (
                                                        <span className="text-xs text-success ml-4">✓ Completed</span>
                                                    )}
                                                </div>
                                                <span className="text-text font-medium ml-4">
                                                    {formatCurrency(order.subtotal)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Session Subtotal */}
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                                        <span className="font-semibold text-text">{t.subtotal}:</span>
                                        <span className="text-lg font-bold text-primary">
                                            {formatCurrency(group.total)}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Table Total */}
                            <div className="bg-primary bg-opacity-10 border-2 border-primary rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xl font-bold text-text">{t.tableTotal}:</span>
                                    <span className="text-2xl font-bold text-primary">
                                        {formatCurrency(tableTotal)}
                                    </span>
                                </div>
                                {allPaid && (
                                    <div className="text-center mt-2 text-success font-medium">
                                        ✓ {t.allPaid}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-700 p-6">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="w-full"
                    >
                        {t.close}
                    </Button>
                </div>
            </div>
        </div>
    );
}
