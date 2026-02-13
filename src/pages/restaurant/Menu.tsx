import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search, } from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
  Textarea,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "../../services/restaurantService";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";

interface MenuProps {
  language?: 'en' | 'th';
}

const Menu: React.FC<MenuProps> = ({ language = 'en' }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Helper to extract name from JSONB structure
  const getItemName = (item: MenuItem): string => {
    if (typeof item.name === 'object' && item.name !== null) {
      return item.name.en || item.name.th || Object.values(item.name)[0] as string || 'Item';
    }
    return String(item.name || 'Item');
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToMenuItems(user.restaurant_id, (data) => {
      setMenuItems(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = getItemName(item)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.is_available);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: MenuItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  if (loading) return <Loading text={language === 'th' ? 'กำลังโหลดเมนู...' : 'Loading menu...'} />;

  const t = {
    en: {
      menu: 'Menu Management',
      manage: 'Manage your menu items and prices',
      addItem: 'Add Item',
      search: 'Search by name or Thai name...',
      availability: 'Availability',
      noItems: 'No menu items found',
      allItems: 'All Items',
      standardVeg: 'Standard/Veg',
      chickenPork: 'Chicken/Pork',
      seafood: 'Seafood',
      page: 'Page',
      disable: 'Disable',
      enable: 'Enable',
      edit: 'Edit',
      delete: 'Delete',
    },
    th: {
      menu: 'จัดการเมนู',
      manage: 'จัดการรายการเมนูและราคา',
      addItem: 'เพิ่มรายการ',
      search: 'ค้นหาตามชื่อหรือชื่อไทย...',
      availability: 'ความพร้อมใช้งาน',
      noItems: 'ไม่พบรายการเมนู',
      allItems: 'รายการทั้งหมด',
      standardVeg: 'มาตรฐาน/เจ',
      chickenPork: 'ไก่/หมู',
      seafood: 'อาหารทะเล',
      page: 'หน้า',
      disable: 'ปิดใช้งาน',
      enable: 'เปิดใช้งาน',
      edit: 'แก้ไข',
      delete: 'ลบ',
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">{t[language as keyof typeof t].menu}</h2>
          <p className="text-text-secondary">{t[language as keyof typeof t].manage}</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>
          {t[language as keyof typeof t].addItem}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder={t[language as keyof typeof t].search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category || "all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${categoryFilter === category ? "bg-accent text-white" : "bg-white border border-border text-text-secondary"
                }`}
            >
              {category === "all" ? t[language as keyof typeof t].allItems : category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className={!item.is_available ? "opacity-60" : ""}>
            <div className="flex flex-col lg:flex-row gap-4">
              {item.image_url && (
                <img src={item.image_url} alt={getItemName(item)} className="w-full lg:w-32 h-32 object-cover rounded-lg" />
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-text">
                      {getItemName(item)}
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="neutral">{t[language as keyof typeof t].page} {item.page_number || '?'}</Badge>
                      <Badge variant="neutral">{item.category}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-bg-subtle p-2 rounded-lg text-xs">
                  <div>
                    <p className="text-text-secondary">{t[language as keyof typeof t].standardVeg}</p>
                    <p className="font-bold text-accent">{formatCurrency(item.price_standard)}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">{t[language as keyof typeof t].chickenPork}</p>
                    <p className="font-bold text-accent">{item.price_chicken_pork ? formatCurrency(item.price_chicken_pork) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">{t[language as keyof typeof t].seafood}</p>
                    <p className="font-bold text-accent">{item.price_seafood ? formatCurrency(item.price_seafood) : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                <Button
                  size="sm"
                  variant={item.is_available ? "outline" : "primary"}
                  onClick={() => handleToggleAvailability(item)}
                >
                  {item.is_available ? t[language as keyof typeof t].disable : t[language as keyof typeof t].enable}
                </Button>

                <Button size="sm" variant="outline" icon={<Edit className="w-4 h-4" />} onClick={() => handleEdit(item)}>{t[language as keyof typeof t].edit}</Button>
                <Button size="sm" variant="outline" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(item)}>{t[language as keyof typeof t].delete}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <MenuItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} mode="add" language={language} />
      <MenuItemModal isOpen={showEditModal} item={selectedItem} onClose={() => { setShowEditModal(false); setSelectedItem(null); }} mode="edit" language={language} />
      <DeleteModal isOpen={showDeleteModal} item={selectedItem} onClose={() => { setShowDeleteModal(false); setSelectedItem(null); }} />
    </div>
  );
};

interface MenuItemModalProps {
  isOpen: boolean;
  item?: MenuItem | null;
  onClose: () => void;
  mode: "add" | "edit";
  language?: 'en' | 'th';
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({ isOpen, item, onClose, mode, language = 'en' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const modalT = {
    en: {
      addItem: 'Add Item',
      editItem: 'Edit Item',
      nameEn: 'Name (EN)',
      nameTh: 'Name (Thai)',
      category: 'Category',
      pageNumber: 'Page Number',
      priceStandard: 'Price Standard',
      priceChickenPork: 'Price Chicken/Pork',
      priceSeafood: 'Price Seafood',
      description: 'Description',
      imageUrl: 'Image URL',
      cancel: 'Cancel',
      create: 'Create Item',
      save: 'Save Changes',
    },
    th: {
      addItem: 'เพิ่มรายการ',
      editItem: 'แก้ไขรายการ',
      nameEn: 'ชื่อ (EN)',
      nameTh: 'ชื่อ (ไทย)',
      category: 'หมวดหมู่',
      pageNumber: 'หมายเลขหน้า',
      priceStandard: 'ราคามาตรฐาน',
      priceChickenPork: 'ราคาไก่/หมู',
      priceSeafood: 'ราคาอาหารทะเล',
      description: 'คำอธิบาย',
      imageUrl: 'URL รูปภาพ',
      cancel: 'ยกเลิก',
      create: 'สร้างรายการ',
      save: 'บันทึกการเปลี่ยนแปลง',
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    name_thai: "",
    description: "",
    category: "",
    price_standard: "",
    price_seafood: "",
    price_chicken_pork: "",
    page_number: "",
    image_url: "",
    is_available: true,
  });

  useEffect(() => {
    if (mode === "edit" && item) {
      const itemName = typeof item.name === 'object' ? (item.name.en || '') : (item.name || '');
      const itemNameTh = typeof item.name === 'object' ? (item.name.th || '') : '';
      const itemDesc = typeof item.description === 'object' ? (item.description.en || '') : (item.description || '');
      setFormData({
        name: itemName,
        name_thai: itemNameTh,
        description: itemDesc,
        category: item.category || "",
        price_standard: item.price_standard?.toString() || "",
        price_seafood: item.price_seafood?.toString() || "",
        price_chicken_pork: item.price_chicken_pork?.toString() || "",
        page_number: item.page_number?.toString() || "",
        image_url: item.image_url || "",
        is_available: item.is_available,
      });
    } else {
      setFormData({
        name: "", name_thai: "", description: "", category: "",
        price_standard: "", price_seafood: "", price_chicken_pork: "",
        page_number: "", image_url: "", is_available: true,
      });
    }
  }, [mode, item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Build JSONB structure for name and description
    const data: Partial<MenuItem> = {
      restaurant_id: user.restaurant_id,
      name: {
        en: formData.name,
        th: formData.name_thai || '',
        ru: '',
        zh: ''
      } as any,
      description: {
        en: formData.description || '',
        ru: '',
        zh: ''
      } as any,
      category: formData.category || undefined,
      price_standard: parseFloat(formData.price_standard),
      price_seafood: formData.price_seafood ? parseFloat(formData.price_seafood) : undefined,
      price_chicken_pork: formData.price_chicken_pork ? parseFloat(formData.price_chicken_pork) : undefined,
      page_number: formData.page_number ? parseInt(formData.page_number) : undefined,
      image_url: formData.image_url || undefined,
      is_available: formData.is_available,
    };

    let success = false;
    if (mode === "add") {
      const result = await createMenuItem(data);
      success = !result.error;
      if (result.error) setError(result.error.message || "Error adding item");
    } else {
      const result = await updateMenuItem(item!.id, data);
      success = !result.error;
      if (result.error) setError(result.error.message || "Error updating item");
    }

    setLoading(false);
    if (success) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "add" ? modalT[language as keyof typeof modalT].addItem : modalT[language as keyof typeof modalT].editItem} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <div className="grid grid-cols-2 gap-4">
          <Input label={modalT[language as keyof typeof modalT].nameEn} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label={modalT[language as keyof typeof modalT].nameTh} value={formData.name_thai} onChange={(e) => setFormData({ ...formData, name_thai: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={modalT[language as keyof typeof modalT].category} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
          <Input label={modalT[language as keyof typeof modalT].pageNumber} type="number" value={formData.page_number} onChange={(e) => setFormData({ ...formData, page_number: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label={modalT[language as keyof typeof modalT].priceStandard} type="number" step="0.01" value={formData.price_standard} onChange={(e) => setFormData({ ...formData, price_standard: e.target.value })} />
          <Input label={modalT[language as keyof typeof modalT].priceChickenPork} type="number" step="0.01" value={formData.price_chicken_pork} onChange={(e) => setFormData({ ...formData, price_chicken_pork: e.target.value })} />
          <Input label={modalT[language as keyof typeof modalT].priceSeafood} type="number" step="0.01" value={formData.price_seafood} onChange={(e) => setFormData({ ...formData, price_seafood: e.target.value })} />
        </div>
        <Textarea label={modalT[language as keyof typeof modalT].description} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        <Input label={modalT[language as keyof typeof modalT].imageUrl} value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
        {formData.image_url && (
          <div className="bg-bg-subtle rounded-lg overflow-hidden">
            <img src={formData.image_url} alt="Preview" className="w-full h-40 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>{modalT[language as keyof typeof modalT].cancel}</Button>
          <Button type="submit" loading={loading} fullWidth>{mode === "add" ? modalT[language as keyof typeof modalT].create : modalT[language as keyof typeof modalT].save}</Button>
        </div>
      </form>
    </Modal>
  );
};

interface DeleteModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, item, onClose }) => {
  const [loading, setLoading] = useState(false);

  const getItemName = (item: MenuItem): string => {
    if (typeof item.name === 'object' && item.name !== null) {
      return item.name.en || item.name.th || Object.values(item.name)[0] as string || 'Item';
    }
    return String(item.name || 'Item');
  };

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);
    const success = await deleteMenuItem(item.id);
    setLoading(false);
    if (success) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Item" size="md">
      <div className="space-y-4">
        <p>Are you sure you want to delete <strong>{item ? getItemName(item) : ''}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} fullWidth>Delete</Button>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;
