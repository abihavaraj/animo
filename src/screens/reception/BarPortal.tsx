import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';

// Types
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  cost: number;
}

interface TableOrder {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface Table {
  id: number;
  number: string;
  status: 'available' | 'occupied' | 'reserved';
  orders: TableOrder[];
  openedAt?: string;
}

interface Sale {
  id: number;
  tableNumber: string;
  items: TableOrder[];
  total: number;
  date: string;
  paymentMethod: string;
}

// Main Bar Portal Component
export default function BarPortal({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'tables' | 'sales' | 'finance'>('dashboard');
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'products':
        return <ProductsTab />;
      case 'tables':
        return <TablesTab />;
      case 'sales':
        return <SalesTab />;
      case 'finance':
        return <FinanceTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <WebCompatibleIcon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <WebCompatibleIcon name="local-bar" size={32} color="#D4B08A" />
            <View>
              <Text style={styles.headerTitle}>Bar Management Portal</Text>
              <Text style={styles.headerSubtitle}>Complete Bar Operations</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <WebCompatibleIcon 
            name="dashboard" 
            size={20} 
            color={activeTab === 'dashboard' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <WebCompatibleIcon 
            name="inventory" 
            size={20} 
            color={activeTab === 'products' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
            Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'tables' && styles.tabActive]}
          onPress={() => setActiveTab('tables')}
        >
          <WebCompatibleIcon 
            name="restaurant" 
            size={20} 
            color={activeTab === 'tables' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>
            Tables
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
          onPress={() => setActiveTab('sales')}
        >
          <WebCompatibleIcon 
            name="receipt-long" 
            size={20} 
            color={activeTab === 'sales' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>
            Sales
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'finance' && styles.tabActive]}
          onPress={() => setActiveTab('finance')}
        >
          <WebCompatibleIcon 
            name="analytics" 
            size={20} 
            color={activeTab === 'finance' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'finance' && styles.tabTextActive]}>
            Finance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

// Dashboard Tab Component
function DashboardTab() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todaySales: 0,
    occupiedTables: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    weekRevenue: 0,
    monthRevenue: 0,
  });

  useEffect(() => {
    // Mock data - replace with actual data from storage/database
    setStats({
      todayRevenue: 245.50,
      todaySales: 18,
      occupiedTables: 3,
      totalProducts: 24,
      lowStockProducts: 5,
      weekRevenue: 1250.80,
      monthRevenue: 5430.20,
    });
  }, []);

  return (
    <ScrollView style={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
      {/* Top Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
          <WebCompatibleIcon name="attach-money" size={32} color="#fff" />
          <Text style={styles.statValue}>€{stats.todayRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Today's Revenue</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
          <WebCompatibleIcon name="receipt" size={32} color="#fff" />
          <Text style={styles.statValue}>{stats.todaySales}</Text>
          <Text style={styles.statLabel}>Sales Today</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
          <WebCompatibleIcon name="restaurant" size={32} color="#fff" />
          <Text style={styles.statValue}>{stats.occupiedTables}</Text>
          <Text style={styles.statLabel}>Occupied Tables</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
          <WebCompatibleIcon name="inventory" size={32} color="#fff" />
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
      </View>

      {/* Revenue Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Overview</Text>
        <View style={styles.revenueGrid}>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>This Week</Text>
            <Text style={styles.revenueValue}>€{stats.weekRevenue.toFixed(2)}</Text>
          </View>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>This Month</Text>
            <Text style={styles.revenueValue}>€{stats.monthRevenue.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Alerts */}
      {stats.lowStockProducts > 0 && (
        <View style={styles.alertCard}>
          <WebCompatibleIcon name="warning" size={24} color="#FF9800" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Low Stock Alert</Text>
            <Text style={styles.alertText}>
              {stats.lowStockProducts} product(s) are running low on stock
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Products Tab Component
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['beverage', 'snack', 'accessory', 'supplement']);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    cost: '',
    category: 'beverage',
    stock: '',
  });

  useEffect(() => {
    // Mock data - replace with actual storage
    setProducts([
      { id: 1, name: 'Water Bottle', price: 2.50, cost: 1.00, category: 'beverage', stock: 50 },
      { id: 2, name: 'Protein Bar', price: 4.00, cost: 2.00, category: 'snack', stock: 25 },
      { id: 3, name: 'Energy Drink', price: 3.50, cost: 1.50, category: 'beverage', stock: 30 },
      { id: 4, name: 'Towel', price: 15.00, cost: 8.00, category: 'accessory', stock: 10 },
      { id: 5, name: 'Coffee', price: 3.00, cost: 0.80, category: 'beverage', stock: 5 },
      { id: 6, name: 'Juice', price: 3.50, cost: 1.20, category: 'beverage', stock: 40 },
    ]);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddProduct = () => {
    if (!formData.name || !formData.price) return;

    const newProduct: Product = {
      id: Date.now(),
      name: formData.name,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost) || 0,
      category: formData.category,
      stock: parseInt(formData.stock) || 0,
    };

    setProducts([...products, newProduct]);
    setFormData({ name: '', price: '', cost: '', category: 'beverage', stock: '' });
    setShowAddModal(false);
  };

  const handleEditProduct = () => {
    if (!editingProduct || !formData.name || !formData.price) return;

    setProducts(products.map(p => 
      p.id === editingProduct.id 
        ? {
            ...p,
            name: formData.name,
            price: parseFloat(formData.price),
            cost: parseFloat(formData.cost) || 0,
            category: formData.category,
            stock: parseInt(formData.stock) || 0,
          }
        : p
    ));

    setEditingProduct(null);
    setFormData({ name: '', price: '', cost: '', category: 'beverage', stock: '' });
    setShowEditModal(false);
  };

  const handleDeleteProduct = (productId: number) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      cost: product.cost.toString(),
      category: product.category,
      stock: product.stock.toString(),
    });
    setShowEditModal(true);
  };

  return (
    <View style={styles.productsContainer}>
      {/* Header with Search and Add */}
      <View style={styles.productsHeader}>
        <View style={styles.searchContainer}>
          <WebCompatibleIcon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <WebCompatibleIcon name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>
            All Products
          </Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products List */}
      <ScrollView style={styles.productsListContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.productsGrid}>
          {filteredProducts.map(product => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productCardHeader}>
                <View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.productActionButton}
                    onPress={() => openEditModal(product)}
                  >
                    <WebCompatibleIcon name="edit" size={18} color="#2196F3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.productActionButton}
                    onPress={() => handleDeleteProduct(product.id)}
                  >
                    <WebCompatibleIcon name="delete" size={18} color="#f44336" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.productDetails}>
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Price:</Text>
                  <Text style={styles.productPrice}>€{product.price.toFixed(2)}</Text>
                </View>
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Cost:</Text>
                  <Text style={styles.productCost}>€{product.cost.toFixed(2)}</Text>
                </View>
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Profit:</Text>
                  <Text style={styles.productProfit}>
                    €{(product.price - product.cost).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.productDetailRow}>
                  <Text style={styles.productDetailLabel}>Stock:</Text>
                  <Text style={[
                    styles.productStock,
                    product.stock < 10 && styles.productStockLow
                  ]}>
                    {product.stock} units
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Product Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Product</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <WebCompatibleIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter product name"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Sell Price (€) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({...formData, price: text})}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Cost Price (€)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.cost}
                    onChangeText={(text) => setFormData({...formData, cost: text})}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.categoryGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        formData.category === cat && styles.categoryButtonActive
                      ]}
                      onPress={() => setFormData({...formData, category: cat})}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        formData.category === cat && styles.categoryButtonTextActive
                      ]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Initial Stock</Text>
                <TextInput
                  style={styles.input}
                  value={formData.stock}
                  onChangeText={(text) => setFormData({...formData, stock: text})}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleAddProduct}
              >
                <Text style={styles.modalConfirmButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Edit Product Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <WebCompatibleIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter product name"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Sell Price (€) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({...formData, price: text})}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Cost Price (€)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.cost}
                    onChangeText={(text) => setFormData({...formData, cost: text})}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.categoryGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        formData.category === cat && styles.categoryButtonActive
                      ]}
                      onPress={() => setFormData({...formData, category: cat})}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        formData.category === cat && styles.categoryButtonTextActive
                      ]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock</Text>
                <TextInput
                  style={styles.input}
                  value={formData.stock}
                  onChangeText={(text) => setFormData({...formData, stock: text})}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleEditProduct}
              >
                <Text style={styles.modalConfirmButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

// Tables Tab Component
function TablesTab() {
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showCloseTableModal, setShowCloseTableModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    // Initialize tables
    const initialTables: Table[] = [];
    for (let i = 1; i <= 12; i++) {
      initialTables.push({
        id: i,
        number: `Table ${i}`,
        status: 'available',
        orders: [],
      });
    }
    setTables(initialTables);

    // Load products
    setProducts([
      { id: 1, name: 'Water Bottle', price: 2.50, cost: 1.00, category: 'beverage', stock: 50 },
      { id: 2, name: 'Protein Bar', price: 4.00, cost: 2.00, category: 'snack', stock: 25 },
      { id: 3, name: 'Energy Drink', price: 3.50, cost: 1.50, category: 'beverage', stock: 30 },
      { id: 4, name: 'Coffee', price: 3.00, cost: 0.80, category: 'beverage', stock: 45 },
      { id: 5, name: 'Juice', price: 3.50, cost: 1.20, category: 'beverage', stock: 40 },
    ]);
  }, []);

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
  };

  const handleAddOrder = () => {
    if (!selectedTable || !selectedProduct || !orderQuantity) return;

    const quantity = parseInt(orderQuantity);
    const newOrder: TableOrder = {
      id: Date.now(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      price: selectedProduct.price,
      total: selectedProduct.price * quantity,
    };

    setTables(tables.map(t => {
      if (t.id === selectedTable.id) {
        const updatedOrders = [...t.orders, newOrder];
        return {
          ...t,
          orders: updatedOrders,
          status: 'occupied' as const,
          openedAt: t.openedAt || new Date().toISOString(),
        };
      }
      return t;
    }));

    setShowAddOrderModal(false);
    setSelectedProduct(null);
    setOrderQuantity('1');
    
    // Update selected table
    const updatedTable = tables.find(t => t.id === selectedTable.id);
    if (updatedTable) {
      setSelectedTable({
        ...updatedTable,
        orders: [...updatedTable.orders, newOrder],
        status: 'occupied',
        openedAt: updatedTable.openedAt || new Date().toISOString(),
      });
    }
  };

  const handleCloseTable = () => {
    if (!selectedTable) return;

    const total = selectedTable.orders.reduce((sum, order) => sum + order.total, 0);

    // Create sale record (you would save this)
    const sale: Sale = {
      id: Date.now(),
      tableNumber: selectedTable.number,
      items: selectedTable.orders,
      total,
      date: new Date().toISOString(),
      paymentMethod,
    };

    console.log('Sale completed:', sale);

    // Clear table
    setTables(tables.map(t => 
      t.id === selectedTable.id 
        ? { ...t, orders: [], status: 'available' as const, openedAt: undefined }
        : t
    ));

    setShowCloseTableModal(false);
    setSelectedTable(null);
  };

  const handleRemoveOrder = (orderId: number) => {
    if (!selectedTable) return;

    const updatedOrders = selectedTable.orders.filter(o => o.id !== orderId);
    
    setTables(tables.map(t => {
      if (t.id === selectedTable.id) {
        return {
          ...t,
          orders: updatedOrders,
          status: updatedOrders.length === 0 ? 'available' as const : 'occupied' as const,
          openedAt: updatedOrders.length === 0 ? undefined : t.openedAt,
        };
      }
      return t;
    }));

    setSelectedTable({
      ...selectedTable,
      orders: updatedOrders,
      status: updatedOrders.length === 0 ? 'available' : 'occupied',
    });
  };

  const getTableTotal = (table: Table) => {
    return table.orders.reduce((sum, order) => sum + order.total, 0);
  };

  return (
    <View style={styles.tablesContainer}>
      <View style={styles.tablesContent}>
        {/* Tables Grid */}
        <ScrollView style={styles.tablesGridContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.tablesGrid}>
            {tables.map(table => {
              const total = getTableTotal(table);
              return (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableCard,
                    table.status === 'occupied' && styles.tableCardOccupied,
                    selectedTable?.id === table.id && styles.tableCardSelected,
                  ]}
                  onPress={() => handleTableClick(table)}
                >
                  <View style={styles.tableCardHeader}>
                    <Text style={styles.tableNumber}>{table.number}</Text>
                    <View style={[
                      styles.tableStatus,
                      table.status === 'occupied' && styles.tableStatusOccupied,
                    ]}>
                      <Text style={styles.tableStatusText}>
                        {table.status === 'occupied' ? 'Occupied' : 'Available'}
                      </Text>
                    </View>
                  </View>
                  {table.status === 'occupied' && (
                    <View style={styles.tableInfo}>
                      <Text style={styles.tableOrders}>{table.orders.length} items</Text>
                      <Text style={styles.tableTotal}>€{total.toFixed(2)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Table Details Panel */}
        {selectedTable && (
          <View style={styles.tableDetailsPanel}>
            <View style={styles.tablePanelHeader}>
              <Text style={styles.tablePanelTitle}>{selectedTable.number}</Text>
              <View style={styles.tablePanelActions}>
                {selectedTable.orders.length > 0 && (
                  <TouchableOpacity
                    style={styles.closeTableButton}
                    onPress={() => setShowCloseTableModal(true)}
                  >
                    <WebCompatibleIcon name="check-circle" size={20} color="#fff" />
                    <Text style={styles.closeTableButtonText}>Close Table</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.addOrderButton}
                  onPress={() => setShowAddOrderModal(true)}
                >
                  <WebCompatibleIcon name="add" size={20} color="#fff" />
                  <Text style={styles.addOrderButtonText}>Add Order</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.ordersListContainer}>
              {selectedTable.orders.length === 0 ? (
                <View style={styles.emptyOrders}>
                  <WebCompatibleIcon name="receipt-long" size={48} color="#ccc" />
                  <Text style={styles.emptyOrdersText}>No orders yet</Text>
                  <Text style={styles.emptyOrdersSubtext}>Click "Add Order" to start</Text>
                </View>
              ) : (
                <>
                  {selectedTable.orders.map(order => (
                    <View key={order.id} style={styles.orderItem}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName}>{order.productName}</Text>
                        <Text style={styles.orderItemDetails}>
                          {order.quantity} x €{order.price.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.orderItemRight}>
                        <Text style={styles.orderItemTotal}>€{order.total.toFixed(2)}</Text>
                        <TouchableOpacity
                          style={styles.removeOrderButton}
                          onPress={() => handleRemoveOrder(order.id)}
                        >
                          <WebCompatibleIcon name="close" size={18} color="#f44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={styles.tableTotalContainer}>
                    <Text style={styles.tableTotalLabel}>Total:</Text>
                    <Text style={styles.tableTotalValue}>
                      €{getTableTotal(selectedTable).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Add Order Modal */}
      <Portal>
        <Modal
          visible={showAddOrderModal}
          onDismiss={() => setShowAddOrderModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Order - {selectedTable?.number}</Text>
              <TouchableOpacity onPress={() => setShowAddOrderModal(false)}>
                <WebCompatibleIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {!selectedProduct ? (
                <>
                  <Text style={styles.inputLabel}>Select Product</Text>
                  <View style={styles.productSelectorList}>
                    {products.map(product => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.productSelectorItem}
                        onPress={() => setSelectedProduct(product)}
                      >
                        <View>
                          <Text style={styles.productSelectorName}>{product.name}</Text>
                          <Text style={styles.productSelectorPrice}>
                            €{product.price.toFixed(2)} • Stock: {product.stock}
                          </Text>
                        </View>
                        <WebCompatibleIcon name="chevron-right" size={20} color="#666" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.selectedProductCard}>
                    <View>
                      <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                      <Text style={styles.selectedProductPrice}>
                        €{selectedProduct.price.toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                      <Text style={styles.changeProductText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      value={orderQuantity}
                      onChangeText={setOrderQuantity}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.orderTotalPreview}>
                    <Text style={styles.orderTotalPreviewLabel}>Total:</Text>
                    <Text style={styles.orderTotalPreviewValue}>
                      €{(selectedProduct.price * parseInt(orderQuantity || '0')).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddOrderModal(false);
                  setSelectedProduct(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {selectedProduct && (
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleAddOrder}
                >
                  <Text style={styles.modalConfirmButtonText}>Add to Table</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Close Table Modal */}
      <Portal>
        <Modal
          visible={showCloseTableModal}
          onDismiss={() => setShowCloseTableModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Close {selectedTable?.number}</Text>
              <TouchableOpacity onPress={() => setShowCloseTableModal(false)}>
                <WebCompatibleIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.closeSummary}>
                <Text style={styles.closeSummaryTitle}>Order Summary</Text>
                {selectedTable?.orders.map(order => (
                  <View key={order.id} style={styles.closeSummaryItem}>
                    <Text style={styles.closeSummaryItemName}>
                      {order.quantity}x {order.productName}
                    </Text>
                    <Text style={styles.closeSummaryItemPrice}>
                      €{order.total.toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={styles.closeSummaryTotal}>
                  <Text style={styles.closeSummaryTotalLabel}>TOTAL:</Text>
                  <Text style={styles.closeSummaryTotalValue}>
                    €{selectedTable ? getTableTotal(selectedTable).toFixed(2) : '0.00'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.paymentMethods}>
                  {['cash', 'card', 'digital'].map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodButton,
                        paymentMethod === method && styles.paymentMethodButtonActive
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text style={[
                        styles.paymentMethodText,
                        paymentMethod === method && styles.paymentMethodTextActive
                      ]}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCloseTableModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: '#4CAF50' }]}
                onPress={handleCloseTable}
              >
                <Text style={styles.modalConfirmButtonText}>Complete Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

// Sales Tab Component
function SalesTab() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    // Mock sales data
    const mockSales: Sale[] = [
      {
        id: 1,
        tableNumber: 'Table 3',
        items: [
          { id: 1, productId: 1, productName: 'Water Bottle', quantity: 2, price: 2.50, total: 5.00 },
          { id: 2, productId: 3, productName: 'Energy Drink', quantity: 1, price: 3.50, total: 3.50 },
        ],
        total: 8.50,
        date: new Date().toISOString(),
        paymentMethod: 'cash',
      },
      {
        id: 2,
        tableNumber: 'Table 7',
        items: [
          { id: 3, productId: 2, productName: 'Protein Bar', quantity: 3, price: 4.00, total: 12.00 },
        ],
        total: 12.00,
        date: new Date(Date.now() - 3600000).toISOString(),
        paymentMethod: 'card',
      },
    ];
    setSales(mockSales);
  }, []);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <View style={styles.salesContainer}>
      {/* Sales Stats */}
      <View style={styles.salesHeader}>
        <View style={styles.salesStatCard}>
          <Text style={styles.salesStatLabel}>Total Sales</Text>
          <Text style={styles.salesStatValue}>{sales.length}</Text>
        </View>
        <View style={styles.salesStatCard}>
          <Text style={styles.salesStatLabel}>Total Revenue</Text>
          <Text style={styles.salesStatValue}>€{totalRevenue.toFixed(2)}</Text>
        </View>
      </View>

      {/* Sales List */}
      <ScrollView style={styles.salesListContainer} showsVerticalScrollIndicator={false}>
        {sales.length === 0 ? (
          <View style={styles.emptySales}>
            <WebCompatibleIcon name="receipt-long" size={64} color="#ccc" />
            <Text style={styles.emptySalesText}>No sales recorded</Text>
          </View>
        ) : (
          sales.map(sale => (
            <TouchableOpacity
              key={sale.id}
              style={styles.saleCard}
              onPress={() => setSelectedSale(sale)}
            >
              <View style={styles.saleCardHeader}>
                <View>
                  <Text style={styles.saleTable}>{sale.tableNumber}</Text>
                  <Text style={styles.saleDate}>
                    {new Date(sale.date).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.saleCardRight}>
                  <Text style={styles.saleTotal}>€{sale.total.toFixed(2)}</Text>
                  <View style={styles.salePaymentBadge}>
                    <Text style={styles.salePaymentText}>{sale.paymentMethod}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.saleItems}>
                {sale.items.length} item(s)
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Sale Details Modal */}
      <Portal>
        <Modal
          visible={!!selectedSale}
          onDismiss={() => setSelectedSale(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sale Details</Text>
              <TouchableOpacity onPress={() => setSelectedSale(null)}>
                <WebCompatibleIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedSale && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.saleDetailInfo}>
                  <Text style={styles.saleDetailLabel}>Table:</Text>
                  <Text style={styles.saleDetailValue}>{selectedSale.tableNumber}</Text>
                </View>
                <View style={styles.saleDetailInfo}>
                  <Text style={styles.saleDetailLabel}>Date:</Text>
                  <Text style={styles.saleDetailValue}>
                    {new Date(selectedSale.date).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.saleDetailInfo}>
                  <Text style={styles.saleDetailLabel}>Payment:</Text>
                  <Text style={styles.saleDetailValue}>{selectedSale.paymentMethod}</Text>
                </View>

                <Text style={styles.saleDetailItemsTitle}>Items:</Text>
                {selectedSale.items.map(item => (
                  <View key={item.id} style={styles.saleDetailItem}>
                    <Text style={styles.saleDetailItemName}>
                      {item.quantity}x {item.productName}
                    </Text>
                    <Text style={styles.saleDetailItemPrice}>
                      €{item.total.toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.saleDetailTotal}>
                  <Text style={styles.saleDetailTotalLabel}>TOTAL:</Text>
                  <Text style={styles.saleDetailTotalValue}>
                    €{selectedSale.total.toFixed(2)}
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setSelectedSale(null)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

// Finance Tab Component
function FinanceTab() {
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [financeData, setFinanceData] = useState({
    revenue: 0,
    cost: 0,
    profit: 0,
    sales: 0,
    avgSale: 0,
  });

  useEffect(() => {
    // Mock data - replace with actual calculations
    const mockData = {
      today: { revenue: 245.50, cost: 120.30, profit: 125.20, sales: 18, avgSale: 13.64 },
      yesterday: { revenue: 180.20, cost: 95.10, profit: 85.10, sales: 12, avgSale: 15.02 },
      week: { revenue: 1250.80, cost: 650.40, profit: 600.40, sales: 89, avgSale: 14.05 },
      month: { revenue: 5430.20, cost: 2850.60, profit: 2579.60, sales: 387, avgSale: 14.03 },
    };

    setFinanceData(mockData[period]);
  }, [period]);

  const profitMargin = financeData.revenue > 0 
    ? ((financeData.profit / financeData.revenue) * 100).toFixed(1)
    : '0.0';

  return (
    <ScrollView style={styles.financeContainer} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['today', 'yesterday', 'week', 'month'] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodButton,
              period === p && styles.periodButtonActive
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[
              styles.periodButtonText,
              period === p && styles.periodButtonTextActive
            ]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue Card */}
      <View style={[styles.financeCard, { backgroundColor: '#4CAF50' }]}>
        <WebCompatibleIcon name="trending-up" size={32} color="#fff" />
        <Text style={styles.financeCardValue}>€{financeData.revenue.toFixed(2)}</Text>
        <Text style={styles.financeCardLabel}>Total Revenue</Text>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Cost</Text>
          <Text style={styles.metricValue}>€{financeData.cost.toFixed(2)}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.metricLabel}>Profit</Text>
          <Text style={[styles.metricValue, { color: '#4CAF50' }]}>
            €{financeData.profit.toFixed(2)}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Sales Count</Text>
          <Text style={styles.metricValue}>{financeData.sales}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Avg Sale</Text>
          <Text style={styles.metricValue}>€{financeData.avgSale.toFixed(2)}</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.metricLabel}>Profit Margin</Text>
          <Text style={[styles.metricValue, { color: '#FF9800' }]}>
            {profitMargin}%
          </Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.financeSummary}>
        <Text style={styles.financeSummaryTitle}>Summary</Text>
        <View style={styles.financeSummaryRow}>
          <Text style={styles.financeSummaryLabel}>Total Revenue:</Text>
          <Text style={styles.financeSummaryValue}>€{financeData.revenue.toFixed(2)}</Text>
        </View>
        <View style={styles.financeSummaryRow}>
          <Text style={styles.financeSummaryLabel}>Total Cost:</Text>
          <Text style={styles.financeSummaryValue}>-€{financeData.cost.toFixed(2)}</Text>
        </View>
        <View style={styles.financeSummaryDivider} />
        <View style={styles.financeSummaryRow}>
          <Text style={[styles.financeSummaryLabel, { fontWeight: 'bold' }]}>Net Profit:</Text>
          <Text style={[styles.financeSummaryValue, { fontWeight: 'bold', color: '#4CAF50' }]}>
            €{financeData.profit.toFixed(2)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#D4B08A',
    backgroundColor: '#f8f5f0',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#D4B08A',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },

  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 13,
    color: '#fff',
    marginTop: 5,
    opacity: 0.9,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  revenueGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#666',
  },

  // Products Styles
  productsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  productsHeader: {
    flexDirection: 'row',
    gap: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#D4B08A',
    borderColor: '#D4B08A',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  productsListContainer: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  productCard: {
    width: '23.5%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  productActionButton: {
    padding: 4,
  },
  productDetails: {
    gap: 8,
  },
  productDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDetailLabel: {
    fontSize: 13,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  productCost: {
    fontSize: 14,
    color: '#666',
  },
  productProfit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  productStock: {
    fontSize: 14,
    color: '#666',
  },
  productStockLow: {
    color: '#FF9800',
    fontWeight: '600',
  },

  // Tables Styles
  tablesContainer: {
    flex: 1,
  },
  tablesContent: {
    flex: 1,
    flexDirection: 'row',
  },
  tablesGridContainer: {
    flex: 1,
    padding: 20,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  tableCard: {
    width: '23.5%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableCardOccupied: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  tableCardSelected: {
    borderColor: '#D4B08A',
    borderWidth: 3,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tableStatus: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tableStatusOccupied: {
    backgroundColor: '#FF9800',
  },
  tableStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  tableInfo: {
    marginTop: 8,
  },
  tableOrders: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tableTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tableDetailsPanel: {
    width: 400,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  tablePanelHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tablePanelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tablePanelActions: {
    flexDirection: 'row',
    gap: 10,
  },
  closeTableButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
  },
  closeTableButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
  },
  addOrderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ordersListContainer: {
    flex: 1,
    padding: 20,
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyOrdersText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  emptyOrdersSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  orderItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  removeOrderButton: {
    padding: 4,
  },
  tableTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  tableTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tableTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },

  // Sales Styles
  salesContainer: {
    flex: 1,
    padding: 20,
  },
  salesHeader: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  salesStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  salesStatLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  salesStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  salesListContainer: {
    flex: 1,
  },
  emptySales: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptySalesText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
  },
  saleCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saleTable: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 13,
    color: '#666',
  },
  saleCardRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 6,
  },
  salePaymentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  salePaymentText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  saleItems: {
    fontSize: 14,
    color: '#666',
  },
  saleDetailInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saleDetailLabel: {
    fontSize: 15,
    color: '#666',
  },
  saleDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  saleDetailItemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  saleDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  saleDetailItemName: {
    fontSize: 15,
    color: '#333',
  },
  saleDetailItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saleDetailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  saleDetailTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saleDetailTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },

  // Finance Styles
  financeContainer: {
    flex: 1,
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#D4B08A',
    borderColor: '#D4B08A',
  },
  periodButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  financeCard: {
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  financeCardValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 10,
  },
  financeCardLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 25,
  },
  metricCard: {
    width: '31.5%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  financeSummary: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  financeSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  financeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  financeSummaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  financeSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  financeSummaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },

  // Modal Styles - PC OPTIMIZED
  modalContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxWidth: 900,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 30,
    maxHeight: 600,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 15,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    backgroundColor: '#D4B08A',
    borderColor: '#D4B08A',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  productSelectorList: {
    maxHeight: 300,
  },
  productSelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productSelectorPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  selectedProductCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectedProductPrice: {
    fontSize: 16,
    color: '#2196F3',
    marginTop: 4,
  },
  changeProductText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  orderTotalPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  orderTotalPreviewLabel: {
    fontSize: 18,
    color: '#333',
    marginRight: 10,
  },
  orderTotalPreviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  closeSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  closeSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  closeSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  closeSummaryItemName: {
    fontSize: 15,
    color: '#333',
  },
  closeSummaryItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  closeSummaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  closeSummaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeSummaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentMethodText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

