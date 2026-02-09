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

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.name_thai && item.name_thai.toLowerCase().includes(searchTerm.toLowerCase()));
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

  if (loading) return <Loading text="Loading menu..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Menu Management</h2>
          <p className="text-text-secondary">Manage your menu items and prices</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>
          Add Item
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name or Thai name..."
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoryFilter === category ? "bg-accent text-white" : "bg-white border border-border text-text-secondary"
              }`}
            >
              {category === "all" ? "All Items" : category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className={!item.is_available ? "opacity-60" : ""}>
            <div className="flex flex-col lg:flex-row gap-4">
              {item.image_url && (
                <img src={item.image_url} alt={item.name} className="w-full lg:w-32 h-32 object-cover rounded-lg" />
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-text">
                      {item.name} <span className="text-accent ml-2">{item.name_thai}</span>
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="neutral">Page {item.page_number || '?'}</Badge>
                      <Badge variant="neutral">{item.category}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-bg-subtle p-2 rounded-lg text-xs">
                  <div>
                    <p className="text-text-secondary">Standard/Veg</p>
                    <p className="font-bold text-accent">{formatCurrency(item.price_standard)}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Chicken/Pork</p>
                    <p className="font-bold text-accent">{item.price_chicken_pork ? formatCurrency(item.price_chicken_pork) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Seafood</p>
                    <p className="font-bold text-accent">{item.price_seafood ? formatCurrency(item.price_seafood) : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                <Button size="sm" variant="outline" icon={<Edit className="w-4 h-4" />} onClick={() => handleEdit(item)}>Edit</Button>
                <Button size="sm" variant="outline" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(item)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <MenuItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} mode="add" />
      <MenuItemModal isOpen={showEditModal} item={selectedItem} onClose={() => { setShowEditModal(false); setSelectedItem(null); }} mode="edit" />
      <DeleteModal isOpen={showDeleteModal} item={selectedItem} onClose={() => { setShowDeleteModal(false); setSelectedItem(null); }} />
    </div>
  );
};

// 1. Définition de l'interface qui manquait (Erreur ligne 164)
interface MenuItemModalProps {
  isOpen: boolean;
  item?: MenuItem | null;
  onClose: () => void;
  mode: "add" | "edit";
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({ isOpen, item, onClose, mode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      setFormData({
        name: item.name,
        name_thai: item.name_thai || "",
        description: item.description || "",
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

    // Correction de l'erreur "null vs undefined" (Ligne 211)
    // On utilise "|| undefined" pour que TypeScript soit content
    const data: Partial<MenuItem> = {
      restaurant_id: user.restaurant_id,
      name: formData.name,
      name_thai: formData.name_thai || undefined,
      description: formData.description || undefined,
      category: formData.category || undefined,
      price_standard: parseFloat(formData.price_standard),
      price_seafood: formData.price_seafood ? parseFloat(formData.price_seafood) : undefined,
      price_chicken_pork: formData.price_chicken_pork ? parseFloat(formData.price_chicken_pork) : undefined,
      page_number: formData.page_number ? parseInt(formData.page_number) : undefined,
      image_url: formData.image_url || undefined,
      is_available: formData.is_available,
    };

    const success = mode === "add" 
      ? await createMenuItem(data) 
      : await updateMenuItem(item!.id, data);

    setLoading(false);
    if (success) onClose(); else setError("Error saving item");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "add" ? "Add Item" : "Edit Item"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name (EN)" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <Input label="Name (Thai)" value={formData.name_thai} onChange={(e) => setFormData({...formData, name_thai: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
          <Input label="Page Number" type="number" value={formData.page_number} onChange={(e) => setFormData({...formData, page_number: e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Price Standard" type="number" step="0.01" value={formData.price_standard} onChange={(e) => setFormData({...formData, price_standard: e.target.value})} required />
          <Input label="Price Chicken/Pork" type="number" step="0.01" value={formData.price_chicken_pork} onChange={(e) => setFormData({...formData, price_chicken_pork: e.target.value})} />
          <Input label="Price Seafood" type="number" step="0.01" value={formData.price_seafood} onChange={(e) => setFormData({...formData, price_seafood: e.target.value})} />
        </div>
        <Textarea label="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
        <Input label="Image URL" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} />
        <div className="flex gap-3 mt-6">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>Cancel</Button>
          <Button type="submit" loading={loading} fullWidth>{mode === "add" ? "Create Item" : "Save Changes"}</Button>
        </div>
      </form>
    </Modal>
  );
};

// 2. Ajout du composant DeleteModal qui manquait (Erreur ligne 159)
interface DeleteModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, item, onClose }) => {
  const [loading, setLoading] = useState(false);
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
        <p>Are you sure you want to delete <strong>{item?.name}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} fullWidth>Delete</Button>
        </div>
      </div>
    </Modal>
  );
};