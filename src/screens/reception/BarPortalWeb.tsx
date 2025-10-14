import React, { useEffect, useState } from 'react';
import { barSupabase } from '../../config/supabase.bar.config';
import { supabase } from '../../config/supabase.config';
import { activityService } from '../../services/activityService';
import { BarOrder, BarProduct, BarSale, barService, TableWithOrders } from '../../services/barService';

// Types
interface StudioClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

// Use Supabase types
type Product = BarProduct;
type Table = TableWithOrders & { orders: BarOrder[] };
type Sale = BarSale;

// Main Bar Portal Component for WEB/PC
export default function BarPortalWeb({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'tables' | 'sales' | 'reports'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'addProduct' | 'editProduct' | 'addOrder' | 'closeTable' | 'addTable' | 'editTable' | 'saleDetails' | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Form data
  const [productForm, setProductForm] = useState({ name: '', price: '', cost: '', category: 'beverage', stock: '' });
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [tableForm, setTableForm] = useState({ tableNumber: '', capacity: '4' });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Quick Sale (POS style)
  const [quickSaleCart, setQuickSaleCart] = useState<BarOrder[]>([]);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Client Linking
  const [studioClients, setStudioClients] = useState<StudioClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<StudioClient | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reports filters
  const [reportType, setReportType] = useState<'finance' | 'inventory'>('finance');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  
  // Sales tab filters
  const [salesDateFilter, setSalesDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [salesCustomStartDate, setSalesCustomStartDate] = useState('');
  const [salesCustomEndDate, setSalesCustomEndDate] = useState('');
  
  // Drag and drop for dashboard products
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
  const [productOrder, setProductOrder] = useState<number[]>([]);
  const [isDragTipDismissed, setIsDragTipDismissed] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('barDragTipDismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    loadAllData();
    // Load saved product order from localStorage
    const savedOrder = localStorage.getItem('barProductOrder');
    if (savedOrder) {
      try {
        setProductOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Error loading product order:', e);
      }
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // F1-F5 for tab navigation
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('dashboard');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('products');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('tables');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('sales');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('reports');
      } else if (e.key === 'r' || e.key === 'R') {
        if (e.ctrlKey || e.metaKey) {
          // Allow normal browser refresh with Ctrl+R
          return;
        }
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadProducts(),
      loadTables(),
      loadSales(),
      loadStudioClients()
    ]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  // Drag and drop handlers
  const handleDragStart = (productId: number) => {
    setDraggedProductId(productId);
  };

  const handleDragOver = (e: React.DragEvent, productId: number) => {
    e.preventDefault();
    
    if (draggedProductId === null || draggedProductId === productId) return;

    const currentOrder = productOrder.length > 0 ? [...productOrder] : dashboardFilteredProducts.map(p => p.id);
    const draggedIndex = currentOrder.indexOf(draggedProductId);
    const targetIndex = currentOrder.indexOf(productId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedProductId);
      setProductOrder(currentOrder);
      localStorage.setItem('barProductOrder', JSON.stringify(currentOrder));
    }
  };

  const handleDragEnd = () => {
    setDraggedProductId(null);
  };

  const loadProducts = async () => {
    const data = await barService.getAllProducts();
    setProducts(data);
  };

  const loadTables = async () => {
    const data = await barService.getAllTables();
    const tablesWithOrders = await Promise.all(
      data.map(async (table) => {
        const orders = await barService.getTableOrders(table.id);
        return {
          ...table,
          orders,
          status: table.status as 'available' | 'occupied',
          number: table.table_number
        };
      })
    );
    
    // Debug: Check if client names are in the data
    const occupiedTables = tablesWithOrders.filter(t => t.status === 'occupied');
    if (occupiedTables.length > 0) {
      console.log('🔍 Occupied tables loaded:', occupiedTables.map(t => ({
        table: t.table_number,
        client: t.linked_client_name || 'NO CLIENT',
        hasClientId: !!t.linked_client_id
      })));
    }
    
    setTables(tablesWithOrders);
  };

  const loadSales = async () => {
    // Load all sales (or at least last 3 months) to enable filtering
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const { data, error } = await barSupabase
        .from('bar_sales')
        .select('*')
        .gte('sale_date', threeMonthsAgo.toISOString())
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    }
  };

  // Load all studio clients
  const loadStudioClients = async () => {
    setIsLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone')
        .eq('role', 'client')
        .order('name');

      if (error) throw error;
      setStudioClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Functions
  const openModal = (type: typeof modalType, data?: any) => {
    setModalType(type);
    if (type === 'editProduct') {
      setEditingProduct(data);
      setProductForm({ name: data.name, price: data.price.toString(), cost: data.cost.toString(), category: data.category, stock: data.stock.toString() });
    } else if (type === 'addProduct') {
      setProductForm({ name: '', price: '', cost: '', category: 'beverage', stock: '' });
    } else if (type === 'addOrder') {
      setSelectedTable(data);
      setSelectedProduct(null);
      setOrderQuantity('1');
      setOrderNotes('');
    } else if (type === 'closeTable') {
      setSelectedTable(data);
    } else if (type === 'addTable') {
      setTableForm({ tableNumber: '', capacity: '4' });
    } else if (type === 'editTable') {
      setSelectedTable(data);
      setTableForm({ tableNumber: data.table_number, capacity: data.capacity.toString() });
    } else if (type === 'saleDetails') {
      setSelectedSale(data);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
    setSelectedTable(null);
    setSelectedProduct(null);
    setEditingProduct(null);
    setSelectedSale(null);
    setTableForm({ tableNumber: '', capacity: '4' });
  };

  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.price) return;
    
    const newProduct = await barService.addProduct({
      name: productForm.name,
      price: parseFloat(productForm.price),
      cost: parseFloat(productForm.cost) || 0,
      category: productForm.category,
      stock: parseInt(productForm.stock) || 0,
      is_available: true,
      image_url: undefined,
      description: undefined
    });
    
    if (newProduct) {
      await loadProducts();
      closeModal();
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct || !productForm.name) return;
    
    const success = await barService.updateProduct(editingProduct.id, {
      name: productForm.name,
      price: parseFloat(productForm.price),
      cost: parseFloat(productForm.cost) || 0,
      category: productForm.category,
      stock: parseInt(productForm.stock) || 0,
    });
    
    if (success) {
      await loadProducts();
      closeModal();
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Delete this product?')) {
      const success = await barService.deleteProduct(id);
      if (success) {
        await loadProducts();
      }
    }
  };

  const handleAddOrder = async () => {
    if (!selectedTable || !selectedProduct) return;
    const quantity = parseInt(orderQuantity);
    
    const newOrder = await barService.addOrderToTable(
      selectedTable.id,
      selectedProduct.id,
      selectedProduct.name,
      quantity,
      selectedProduct.price,
      orderNotes || undefined
    );
    
    if (newOrder) {
      await loadTables();
      closeModal();
    }
  };

  const handleCloseTable = async () => {
    if (!selectedTable) return;
    
    try {
      const sale = await barService.closeTableAndCreateSale(
        selectedTable.id,
        paymentMethod as 'cash' | 'card' | 'digital' | 'credit',
        undefined, // Staff ID - can get from auth
        'Reception',
        0, // discount
        undefined // notes
      );
      
      if (sale) {
        await loadTables();
        await loadSales();
        closeModal();
        alert(`Table closed! Total: Lek ${sale.total.toFixed(2)}`);
      } else {
        alert('Error closing table. Please try again.');
        console.error('Failed to create sale - no sale object returned');
      }
    } catch (error) {
      console.error('Error closing table:', error);
      alert('Error closing table: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleRemoveOrder = async (orderId: number) => {
    if (!selectedTable) return;
    
    const success = await barService.removeOrderFromTable(orderId);
    if (success) {
      await loadTables();
      // Refresh selected table
      const updatedTable = tables.find(t => t.id === selectedTable.id);
      if (updatedTable) {
        setSelectedTable(updatedTable);
      }
    }
  };

  const handleAddTable = async () => {
    const tableNumber = tableForm.tableNumber.trim();
    const capacity = parseInt(tableForm.capacity);
    
    if (!tableNumber || !capacity) {
      alert('Please fill all fields');
      return;
    }

    try {
      const { data, error } = await barSupabase
        .from('bar_tables')
        .insert([{
          table_number: tableNumber,
          capacity,
          status: 'available'
        }])
        .select()
        .single();

      if (error) throw error;

      await loadTables();
      setTableForm({ tableNumber: '', capacity: '4' });
      closeModal();
      alert('Table added successfully!');
    } catch (error) {
      console.error('Error adding table:', error);
      alert('Error adding table. Please try again.');
    }
  };

  const handleEditTable = async () => {
    if (!selectedTable) return;
    
    const tableNumber = tableForm.tableNumber.trim();
    const capacity = parseInt(tableForm.capacity);
    
    if (!tableNumber || !capacity) {
      alert('Please fill all fields');
      return;
    }

    try {
      const { error } = await barSupabase
        .from('bar_tables')
        .update({
          table_number: tableNumber,
          capacity
        })
        .eq('id', selectedTable.id);

      if (error) throw error;

      await loadTables();
      closeModal();
      alert('Table updated successfully!');
    } catch (error) {
      console.error('Error updating table:', error);
      alert('Error updating table. Please try again.');
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const { error } = await barSupabase
        .from('bar_tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;

      await loadTables();
      alert('Table deleted successfully!');
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Error deleting table. Please try again.');
    }
  };

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => categoryFilter === 'all' || p.category === categoryFilter);
  const dashboardFilteredProducts = products.filter(p => p.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()));
  
  // Sort dashboard products by custom order
  const sortedDashboardProducts = (() => {
    if (productOrder.length === 0) {
      return dashboardFilteredProducts;
    }
    
    const sorted = [...dashboardFilteredProducts].sort((a, b) => {
      const indexA = productOrder.indexOf(a.id);
      const indexB = productOrder.indexOf(b.id);
      
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
    
    return sorted;
  })();
  
  // Calculate revenue based on date filter
  const getFilteredSales = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      
      // Date filter
      let dateMatch = false;
      switch (dateFilter) {
        case 'today':
          dateMatch = saleDate >= today;
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateMatch = saleDate >= yesterday && saleDate < today;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateMatch = saleDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateMatch = saleDate >= monthAgo;
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) {
            dateMatch = true;
          } else {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59);
            dateMatch = saleDate >= start && saleDate <= end;
          }
          break;
        default:
          dateMatch = true;
      }
      
      // Client filter
      const clientMatch = clientFilter === 'all' || sale.client_id === clientFilter;
      
      return dateMatch && clientMatch;
    });
  };

  const filteredSales = getFilteredSales();
  const todayRevenue = sales.reduce((sum, s) => sum + parseFloat(String(s.total || 0)), 0);
  const filteredRevenue = filteredSales.reduce((sum, s) => sum + parseFloat(String(s.total || 0)), 0);
  
  // Filter sales for the sales tab
  const getFilteredSalesForTab = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      
      switch (salesDateFilter) {
        case 'all':
          return true;
        case 'today':
          return saleDate >= today;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return saleDate >= yesterday && saleDate < today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return saleDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return saleDate >= monthAgo;
        case 'custom':
          if (!salesCustomStartDate || !salesCustomEndDate) return true;
          const start = new Date(salesCustomStartDate);
          const end = new Date(salesCustomEndDate);
          end.setHours(23, 59, 59);
          return saleDate >= start && saleDate <= end;
        default:
          return true;
      }
    });
  };
  
  const filteredSalesForTab = getFilteredSalesForTab();

  // Calculate profit from filtered sales
  const filteredProfit = filteredSales.reduce((total, sale) => {
    if (!sale.items || !Array.isArray(sale.items)) return total;
    
    const saleProfit = sale.items.reduce((saleSum: number, item: any) => {
      const product = products.find(p => p.name === item.product_name);
      if (product && product.cost) {
        const itemProfit = (product.price - product.cost) * item.quantity;
        return saleSum + itemProfit;
      }
      return saleSum;
    }, 0);
    
    return total + saleProfit;
  }, 0);

  const filteredCost = filteredRevenue - filteredProfit;

  // Top selling products
  const getTopProducts = () => {
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    filteredSales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const productName = item.product_name;
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity;
          productSales[productName].revenue += item.total || 0;
        });
      }
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  // Get unique clients who have made purchases
  const getClientsFromSales = () => {
    const clientsMap = new Map<string, { id: string; name: string; total: number; count: number }>();
    
    sales.forEach(sale => {
      if (sale.client_id && sale.client_name) {
        if (!clientsMap.has(sale.client_id)) {
          clientsMap.set(sale.client_id, {
            id: sale.client_id,
            name: sale.client_name,
            total: 0,
            count: 0
          });
        }
        const client = clientsMap.get(sale.client_id)!;
        client.total += parseFloat(String(sale.total || 0));
        client.count += 1;
      }
    });
    
    return Array.from(clientsMap.values()).sort((a, b) => b.total - a.total);
  };

  const clientsWithPurchases = getClientsFromSales();

  // Payment method breakdown
  const paymentBreakdown = {
    cash: filteredSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + parseFloat(String(s.total)), 0),
    card: filteredSales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + parseFloat(String(s.total)), 0),
    digital: filteredSales.filter(s => s.payment_method === 'digital').reduce((sum, s) => sum + parseFloat(String(s.total)), 0),
    credit: filteredSales.filter(s => s.payment_method === 'credit').reduce((sum, s) => sum + parseFloat(String(s.total)), 0),
  };

  // Low stock alerts
  const lowStockProducts = products.filter(p => p.stock < 10);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  
  // Load dismissed alerts from localStorage
  const [dismissedAlerts, setDismissedAlerts] = useState<{ lowStock: boolean; outOfStock: boolean }>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('barDismissedAlerts');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return { lowStock: false, outOfStock: false };
        }
      }
    }
    return { lowStock: false, outOfStock: false };
  });

  // Save dismissed alerts to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('barDismissedAlerts', JSON.stringify(dismissedAlerts));
    }
  }, [dismissedAlerts]);

  // Quick Sale Functions
  const addToQuickSale = (product: Product) => {
    const existing = quickSaleCart.find(item => item.product_id === product.id);
    if (existing) {
      setQuickSaleCart(quickSaleCart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * product.price }
          : item
      ));
    } else {
      const newItem: BarOrder = {
        id: Date.now(),
        table_id: 0, // Temporary
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        status: 'pending',
        ordered_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      setQuickSaleCart([...quickSaleCart, newItem]);
    }
  };

  const removeFromQuickSale = (itemId: number) => {
    setQuickSaleCart(quickSaleCart.filter(item => item.id !== itemId));
  };

  const clearQuickSale = () => {
    setQuickSaleCart([]);
  };

  const completeQuickSale = async () => {
    if (quickSaleCart.length === 0) return;
    
    const total = quickSaleCart.reduce((sum, item) => sum + item.total_price, 0);
    
    try {
      const { data, error } = await barSupabase
        .from('bar_sales')
        .insert([{
          table_number: 'Quick Sale',
          table_id: null,
          client_id: selectedClient?.id,
          client_name: selectedClient?.name,
          items: quickSaleCart.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total_price
          })),
          subtotal: total,
          discount: 0,
          total,
          payment_method: paymentMethod,
          payment_status: 'completed',
          served_by_staff_name: 'Reception'
        }])
        .select()
        .single();

      if (error) throw error;

      // Deduct stock
      for (const item of quickSaleCart) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await barService.updateStock(item.product_id, product.stock - item.quantity);
        }
      }

      await loadSales();
      await loadProducts();
      setQuickSaleCart([]);
      setSelectedClient(null);
      setShowQuickSaleModal(false);
      setPaymentMethod('cash'); // Reset to default
      alert(`Sale completed! Total: Lek ${total.toFixed(2)}`);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error completing sale. Please try again.');
    }
  };

  const printReceipt = () => {
    const total = quickSaleCart.reduce((sum, item) => sum + item.total_price, 0);
    const receiptContent = `
=================================
      BAR RECEIPT
=================================
Date: ${new Date().toLocaleString()}

${quickSaleCart.map(item => `${item.quantity}x ${item.product_name.padEnd(20)} Lek ${item.total_price.toFixed(2)}`).join('\n')}

---------------------------------
TOTAL:              Lek ${total.toFixed(2)}
=================================
    `;
    
    // Create print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px;">${receiptContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const transferToTable = async (tableId: number) => {
    if (quickSaleCart.length === 0) return;
    
    const targetTable = tables.find(t => t.id === tableId);
    if (!targetTable) return;

    const total = quickSaleCart.reduce((sum, item) => sum + item.total_price, 0);
    const itemsList = quickSaleCart.map(item => `${item.quantity}x ${item.product_name}`).join(', ');

    // Debug: Log what client info we're passing
    console.log('🎯 Transferring to table with client:', {
      tableId,
      tableName: targetTable.table_number,
      selectedClient: selectedClient ? {
        id: selectedClient.id,
        name: selectedClient.name
      } : 'NO CLIENT SELECTED'
    });

    // Transfer cart items to table using service
    const success = await barService.transferCartToTable(
      tableId,
      quickSaleCart.map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price
      })),
      selectedClient?.id,
      selectedClient?.name
    );

    if (!success) {
      alert('Error transferring items to table');
      return;
    }

    // Log activity to client profile if client is selected
    // Note: This logs to the studio database, not the bar database
    if (selectedClient) {
      try {
        await activityService.logActivity({
          staff_id: 'reception',
          staff_name: 'Reception',
          staff_role: 'reception',
          activity_type: 'bar_order',
          activity_description: `Bar order transferred to ${targetTable.table_number}`,
          client_id: selectedClient.id,
          client_name: selectedClient.name,
          metadata: {
            tableNumber: targetTable.table_number,
            items: itemsList,
            total: total,
            orderDate: new Date().toISOString()
          }
        });
        console.log('✅ Activity logged to client profile in studio database');
      } catch (error) {
        // Activity logging is optional - don't block the transfer if it fails
        // Silently ignore - different database with different RLS policies
        // console.warn('⚠️ Failed to log activity to studio database (non-critical):', error);
      }
    }

    // Capture client message before clearing
    const clientMsg = selectedClient ? ` for ${selectedClient.name}` : '';
    
    // Reload tables and clear cart
    await loadTables();
    setQuickSaleCart([]);
    setShowTransferModal(false);
    setSelectedClient(null);
    setClientSearchQuery('');
    
    alert(`Items transferred to ${targetTable.table_number}${clientMsg}. Client can pay later!`);
  };

  return (
    <div style={webStyles.container}>
      {/* Header */}
      <div style={webStyles.header}>
        <h1 style={webStyles.title}>🍷 Bar Management Portal</h1>
        
        {/* Keyboard Shortcuts Hint */}
        <div style={{
          padding: '8px 15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666',
          marginLeft: 'auto',
          marginRight: '15px',
          border: '1px solid #e0e0e0'
        }}>
          ⌨️ Shortcuts: <strong>F1-F5</strong> (Tabs) • <strong>R</strong> (Refresh)
        </div>
        
        <button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          style={{
            padding: '10px 20px',
            backgroundColor: isRefreshing ? '#ccc' : '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{
            display: 'inline-block',
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
          }}>🔄</span>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div style={webStyles.tabs}>
        {['dashboard', 'products', 'tables', 'sales', 'reports'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{...webStyles.tab, ...(activeTab === tab ? webStyles.tabActive : {})}}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={webStyles.content}>
         {/* DASHBOARD TAB - POS STYLE */}
         {activeTab === 'dashboard' && (
           <div style={{display: 'flex', gap: '20px', height: '100%'}}>
             {/* Products Grid - Left Side */}
             <div style={{flex: 2, overflowY: 'auto'}}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px'}}>
                 <h2 style={{margin: 0}}>Select Products</h2>
                 <input
                   type="text"
                   placeholder="🔍 Search products..."
                   value={dashboardSearchQuery}
                   onChange={(e) => setDashboardSearchQuery(e.target.value)}
                   style={{
                     padding: '10px 15px',
                     fontSize: '15px',
                     border: '2px solid #ddd',
                     borderRadius: '8px',
                     width: '300px'
                   }}
                 />
               </div>
               {/* Low Stock Alerts */}
               {outOfStockProducts.length > 0 && !dismissedAlerts.outOfStock && (
                 <div style={{
                   backgroundColor: '#ffebee',
                   border: '2px solid #f44336',
                   borderRadius: '8px',
                   padding: '15px',
                   marginBottom: '15px',
                   position: 'relative'
                 }}>
                   <button
                     onClick={() => setDismissedAlerts({...dismissedAlerts, outOfStock: true})}
                     style={{
                       position: 'absolute',
                       top: '10px',
                       right: '10px',
                       background: 'none',
                       border: 'none',
                       fontSize: '20px',
                       cursor: 'pointer',
                       color: '#c62828',
                       padding: '0',
                       lineHeight: '1'
                     }}
                   >
                     ✕
                   </button>
                   <strong style={{color: '#c62828'}}>⚠️ Out of Stock:</strong>
                   <span style={{marginLeft: '10px', color: '#666'}}>
                     {outOfStockProducts.map(p => p.name).join(', ')}
                   </span>
                 </div>
               )}
               {lowStockProducts.length > 0 && !dismissedAlerts.lowStock && (
                 <div style={{
                   backgroundColor: '#fff3e0',
                   border: '2px solid #ff9800',
                   borderRadius: '8px',
                   padding: '15px',
                   marginBottom: '15px',
                   position: 'relative'
                 }}>
                   <button
                     onClick={() => setDismissedAlerts({...dismissedAlerts, lowStock: true})}
                     style={{
                       position: 'absolute',
                       top: '10px',
                       right: '10px',
                       background: 'none',
                       border: 'none',
                       fontSize: '20px',
                       cursor: 'pointer',
                       color: '#e65100',
                       padding: '0',
                       lineHeight: '1'
                     }}
                   >
                     ✕
                   </button>
                   <strong style={{color: '#e65100'}}>⚡ Low Stock ({'<'} 10):</strong>
                   <span style={{marginLeft: '10px', color: '#666'}}>
                     {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
                   </span>
                 </div>
               )}
               {/* Drag and drop hint */}
               {!isDragTipDismissed && (
                 <div style={{
                   backgroundColor: '#E3F2FD',
                   padding: '10px 15px',
                   borderRadius: '8px',
                   marginBottom: '15px',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '10px',
                   border: '1px solid #2196F3',
                   position: 'relative'
                 }}>
                   <span style={{fontSize: '20px'}}>✋</span>
                   <p style={{margin: 0, fontSize: '14px', color: '#1976D2', flex: 1}}>
                     <strong>Tip:</strong> Drag and drop products to rearrange them to your preference!
                   </p>
                   <button
                     onClick={() => {
                       setIsDragTipDismissed(true);
                       localStorage.setItem('barDragTipDismissed', 'true');
                     }}
                     style={{
                       background: 'none',
                       border: 'none',
                       fontSize: '20px',
                       cursor: 'pointer',
                       color: '#1976D2',
                       padding: '0',
                       lineHeight: '1',
                       opacity: 0.7,
                       transition: 'opacity 0.2s'
                     }}
                     onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                     onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                   >
                     ✕
                   </button>
                 </div>
               )}
               
               <div style={webStyles.productsGrid}>
                 {sortedDashboardProducts.map(product => (
                   <div 
                     key={product.id}
                     draggable
                     onDragStart={() => handleDragStart(product.id)}
                     onDragOver={(e) => handleDragOver(e, product.id)}
                     onDragEnd={handleDragEnd}
                     onClick={() => addToQuickSale(product)}
                     style={{
                       ...webStyles.productCard,
                       cursor: draggedProductId === product.id ? 'grabbing' : 'grab',
                       transition: 'transform 0.2s, opacity 0.2s, box-shadow 0.2s',
                       opacity: draggedProductId === product.id ? 0.5 : 1,
                       transform: draggedProductId === product.id ? 'scale(0.95)' : 'scale(1)',
                       boxShadow: draggedProductId === product.id 
                         ? '0 8px 16px rgba(0,0,0,0.3)' 
                         : '0 2px 4px rgba(0,0,0,0.1)',
                       border: draggedProductId === product.id ? '2px dashed #2196F3' : '1px solid #e0e0e0'
                     }}
                   >
                     <div style={{
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'flex-start',
                       marginBottom: '10px'
                     }}>
                       <h3 style={{margin: 0, fontSize: '18px', flex: 1}}>{product.name}</h3>
                       <span style={{
                         fontSize: '16px',
                         color: '#999',
                         cursor: 'grab',
                         padding: '5px'
                       }}>
                         ⋮⋮
                       </span>
                     </div>
                     <p style={{fontSize: '24px', fontWeight: 'bold', color: '#4CAF50', margin: '10px 0'}}>
                       Lek {product.price.toFixed(2)}
                     </p>
                     <p style={{fontSize: '12px', color: '#999', textTransform: 'capitalize'}}>
                       {product.category}
                     </p>
                     <p style={{fontSize: '12px', color: product.stock < 10 ? '#FF9800' : '#666', marginTop: '5px'}}>
                       Stock: {product.stock}
                     </p>
                   </div>
                 ))}
               </div>
             </div>

             {/* Cart/Bill - Right Side */}
             <div style={{
               flex: 1,
               backgroundColor: '#fff',
               padding: '25px',
               borderRadius: '12px',
               boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
               display: 'flex',
               flexDirection: 'column',
               maxWidth: '400px'
             }}>
               <h2 style={{marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '15px'}}>
                 Current Bill
               </h2>

               {quickSaleCart.length === 0 ? (
                 <div style={{textAlign: 'center', padding: '60px 20px', color: '#999'}}>
                   <p style={{fontSize: '48px', marginBottom: '10px'}}>🛒</p>
                   <p>Click products to add to bill</p>
                 </div>
               ) : (
                 <>
                   <div style={{flex: 1, overflowY: 'auto', marginBottom: '20px'}}>
                     {quickSaleCart.map(item => (
                       <div key={item.id} style={{
                         display: 'flex',
                         justifyContent: 'space-between',
                         padding: '15px 0',
                         borderBottom: '1px solid #f0f0f0'
                       }}>
                         <div style={{flex: 1}}>
                           <p style={{fontWeight: 'bold', marginBottom: '5px'}}>{item.product_name}</p>
                           <p style={{color: '#666', fontSize: '14px'}}>
                             {item.quantity} x Lek {item.unit_price.toFixed(2)}
                           </p>
                         </div>
                         <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                           <p style={{fontWeight: 'bold', color: '#4CAF50', fontSize: '18px'}}>
                             Lek {item.total_price.toFixed(2)}
                           </p>
                           <button 
                             onClick={() => removeFromQuickSale(item.id)}
                             style={{
                               background: 'none',
                               border: 'none',
                               cursor: 'pointer',
                               fontSize: '18px'
                             }}
                           >
                             ❌
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>

                   <div style={{
                     borderTop: '3px solid #e0e0e0',
                     paddingTop: '20px',
                     marginBottom: '20px'
                   }}>
                     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                       <strong style={{fontSize: '24px'}}>TOTAL:</strong>
                       <strong style={{fontSize: '32px', color: '#4CAF50'}}>
                         Lek {quickSaleCart.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                       </strong>
                     </div>
                   </div>

                  {/* Payment Method Selector */}
                  <div style={{marginBottom: '15px'}}>
                    <label style={{display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: '600', color: '#333'}}>
                      Payment Method:
                    </label>
                    <div style={{display: 'flex', gap: '10px'}}>
                      {['cash', 'card', 'digital'].map(method => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: paymentMethod === method ? '#4CAF50' : '#fff',
                            color: paymentMethod === method ? '#fff' : '#666',
                            border: '2px solid #4CAF50',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s'
                          }}
                        >
                          {method === 'cash' && '💵'}
                          {method === 'card' && '💳'}
                          {method === 'digital' && '📱'}
                          {' '}{method.charAt(0).toUpperCase() + method.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <button
                      onClick={printReceipt}
                      style={{
                        padding: '15px',
                        backgroundColor: '#2196F3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      🖨️ Print Receipt
                    </button>
                    <button
                      onClick={completeQuickSale}
                      style={{
                        padding: '15px',
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Complete Sale ({paymentMethod.toUpperCase()})
                    </button>
                    <button
                      onClick={() => setShowTransferModal(true)}
                      style={{
                        padding: '15px',
                        backgroundColor: '#FF9800',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      📋 Transfer to Table
                    </button>
                    <button
                      onClick={clearQuickSale}
                      style={{
                        padding: '12px',
                        backgroundColor: '#fff',
                        color: '#f44336',
                        border: '1px solid #f44336',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                 </>
               )}
             </div>
           </div>
         )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div>
            <div style={webStyles.toolbar}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={webStyles.searchInput}
              />
              <button onClick={() => openModal('addProduct')} style={webStyles.addButton}>
                + Add Product
              </button>
            </div>

            {/* Category Filter */}
            <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
              {['all', 'beverage', 'snack', 'accessory', 'supplement'].map((category) => {
                const count = category === 'all' 
                  ? products.length 
                  : products.filter(p => p.category === category).length;
                
                return (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: categoryFilter === category ? '#D4B08A' : '#fff',
                      color: categoryFilter === category ? '#fff' : '#333',
                      border: '2px solid #D4B08A',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {category === 'all' ? '🔍 All' : category === 'beverage' ? '☕ Beverages' : category === 'snack' ? '🍪 Snacks' : category === 'accessory' ? '🛍️ Accessories' : '💊 Supplements'} ({count})
                  </button>
                );
              })}
            </div>

            <div style={webStyles.productsGrid}>
              {filteredProducts.map(product => (
                <div key={product.id} style={webStyles.productCard}>
                  <div style={webStyles.productHeader}>
                    <div>
                      <h3 style={webStyles.productName}>{product.name}</h3>
                      <p style={webStyles.productCategory}>{product.category}</p>
                    </div>
                    <div>
                      <button onClick={() => openModal('editProduct', product)} style={webStyles.iconButton}>✏️</button>
                      <button onClick={() => handleDeleteProduct(product.id)} style={webStyles.iconButton}>🗑️</button>
                    </div>
                  </div>
                  <div style={webStyles.productDetails}>
                    <p>Price: <strong>Lek {product.price.toFixed(2)}</strong></p>
                    <p>Cost: Lek {product.cost.toFixed(2)}</p>
                    <p>Profit: <strong style={{color: '#2196F3'}}>Lek {(product.price - product.cost).toFixed(2)}</strong></p>
                    <p style={product.stock < 10 ? {color: '#FF9800', fontWeight: 'bold'} : {}}>
                      Stock: {product.stock} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABLES TAB */}
        {activeTab === 'tables' && (
          <div style={{display: 'flex', gap: '20px'}}>
            <div style={{flex: 2}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2 style={{margin: 0}}>All Tables</h2>
                <button onClick={() => openModal('addTable')} style={{...webStyles.primaryButton, padding: '12px 24px'}}>
                  + Add New Table
                </button>
              </div>
              <div style={webStyles.tablesGrid}>
                {tables.map(table => (
                  <div
                    key={table.id}
                    style={{
                      ...webStyles.tableCard,
                      backgroundColor: table.status === 'occupied' ? '#FFF3E0' : '#fff',
                      borderColor: selectedTable?.id === table.id ? '#D4B08A' : (table.status === 'occupied' ? '#FF9800' : '#e0e0e0'),
                      borderWidth: selectedTable?.id === table.id ? '3px' : '2px',
                      position: 'relative'
                    }}
                  >
                    <div onClick={() => setSelectedTable(table)} style={{cursor: 'pointer'}}>
                      <h3>{table.table_number}</h3>
                      <p style={{...webStyles.tableBadge, backgroundColor: table.status === 'occupied' ? '#FF9800' : '#4CAF50'}}>
                        {table.status === 'occupied' ? 'Occupied' : 'Available'}
                      </p>
                      {table.linked_client_name && (
                        <p style={{
                          fontSize: '13px',
                          color: '#2196F3',
                          fontWeight: '600',
                          marginTop: '8px',
                          padding: '6px 10px',
                          backgroundColor: '#E3F2FD',
                          borderRadius: '6px',
                          border: '1px solid #2196F3'
                        }}>
                          👤 {table.linked_client_name}
                        </p>
                      )}
                      {table.status === 'occupied' && (
                        <p style={{fontSize: '20px', fontWeight: 'bold', color: '#4CAF50', marginTop: '10px'}}>
                          Lek {table.orders.reduce((sum, o) => sum + o.total_price, 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal('editTable', table); }}
                        style={{
                          flex: 1,
                          padding: '6px',
                          backgroundColor: '#2196F3',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                        style={{
                          flex: 1,
                          padding: '6px',
                          backgroundColor: table.status === 'occupied' ? '#ccc' : '#f44336',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: table.status === 'occupied' ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                        disabled={table.status === 'occupied'}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTable && (
              <div style={webStyles.tablePanel}>
                <h2>{selectedTable.table_number}</h2>
                {selectedTable.linked_client_name && (
                  <div style={{
                    padding: '12px 15px',
                    backgroundColor: '#E3F2FD',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    border: '2px solid #2196F3'
                  }}>
                    <p style={{margin: 0, fontSize: '14px', color: '#1976D2', fontWeight: '600'}}>
                      👤 Client: {selectedTable.linked_client_name}
                    </p>
                  </div>
                )}
                <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                  <button onClick={() => openModal('addOrder', selectedTable)} style={webStyles.primaryButton}>
                    + Add Order
                  </button>
                  {selectedTable.orders.length > 0 && (
                    <button onClick={() => openModal('closeTable', selectedTable)} style={{...webStyles.primaryButton, backgroundColor: '#4CAF50'}}>
                      ✓ Close Table
                    </button>
                  )}
                </div>

                {selectedTable.orders.length === 0 ? (
                  <p style={{textAlign: 'center', padding: '40px', color: '#999'}}>No orders yet</p>
                ) : (
                  <>
                    {selectedTable.orders.map(order => (
                      <div key={order.id} style={webStyles.orderItem}>
                        <div style={{flex: 1}}>
                          <p style={{fontWeight: 'bold'}}>{order.product_name}</p>
                          <p style={{color: '#666'}}>{order.quantity} x Lek {order.unit_price.toFixed(2)}</p>
                          {order.notes && (
                            <p style={{
                              marginTop: '5px',
                              padding: '8px',
                              backgroundColor: '#FFF9E6',
                              borderLeft: '3px solid #FFB74D',
                              fontSize: '13px',
                              color: '#E65100',
                              fontStyle: 'italic',
                              borderRadius: '4px'
                            }}>
                              📝 {order.notes}
                            </p>
                          )}
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                          <p style={{fontWeight: 'bold', color: '#4CAF50'}}>Lek {order.total_price.toFixed(2)}</p>
                          <button onClick={() => handleRemoveOrder(order.id)} style={webStyles.iconButton}>❌</button>
                        </div>
                      </div>
                    ))}
                    <div style={webStyles.tableTotal}>
                      <strong>TOTAL:</strong>
                      <strong style={{fontSize: '24px', color: '#4CAF50'}}>
                        Lek {selectedTable.orders.reduce((sum, o) => sum + o.total_price, 0).toFixed(2)}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* SALES TAB */}
        {activeTab === 'sales' && (
          <div>
            <h2>Sales History</h2>
            
            {/* Date Filter for Sales */}
            <div style={{backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '25px', marginTop: '15px'}}>
              <h3 style={{marginTop: 0, marginBottom: '15px'}}>Date Filter</h3>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                {['all', 'today', 'yesterday', 'week', 'month', 'custom'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSalesDateFilter(filter as any)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: salesDateFilter === filter ? '#2196F3' : '#fff',
                      color: salesDateFilter === filter ? '#fff' : '#333',
                      border: '2px solid #2196F3',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textTransform: 'capitalize'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              
              {salesDateFilter === 'custom' && (
                <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>Start Date:</label>
                    <input
                      type="date"
                      value={salesCustomStartDate}
                      onChange={(e) => setSalesCustomStartDate(e.target.value)}
                      style={{padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>End Date:</label>
                    <input
                      type="date"
                      value={salesCustomEndDate}
                      onChange={(e) => setSalesCustomEndDate(e.target.value)}
                      style={{padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sales Summary */}
            <div style={{
              backgroundColor: '#E3F2FD',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{margin: 0, fontSize: '14px', color: '#666'}}>
                  Showing {filteredSalesForTab.length} sale(s)
                </p>
              </div>
              <div style={{textAlign: 'right'}}>
                <p style={{margin: 0, fontSize: '14px', color: '#666'}}>Total Revenue:</p>
                <p style={{margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#2196F3'}}>
                  Lek {filteredSalesForTab.reduce((sum, s) => sum + parseFloat(String(s.total || 0)), 0).toFixed(2)}
                </p>
              </div>
            </div>

            <p style={{color: '#666', marginBottom: '20px'}}>Click on any sale to view details</p>
            
            {filteredSalesForTab.length === 0 ? (
              <div style={{textAlign: 'center', padding: '60px 20px', color: '#999'}}>
                <p style={{fontSize: '48px', marginBottom: '10px'}}>📊</p>
                <p>No sales found for the selected period</p>
              </div>
            ) : (
              filteredSalesForTab.map(sale => (
                <div 
                  key={sale.id} 
                  onClick={() => openModal('saleDetails', sale)}
                  style={{
                    ...webStyles.saleCard,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    ':hover': { transform: 'translateY(-2px)' }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <div>
                      <h3>{sale.table_number}</h3>
                      <p style={{color: '#666'}}>{new Date(sale.sale_date).toLocaleString()}</p>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <p style={{fontSize: '22px', fontWeight: 'bold', color: '#4CAF50'}}>Lek {parseFloat(String(sale.total)).toFixed(2)}</p>
                      <p style={{...webStyles.paymentBadge}}>{sale.payment_method}</p>
                    </div>
                  </div>
                  <p style={{marginTop: '10px', color: '#666'}}>{sale.items?.length || 0} item(s) • Click to view details →</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            {/* Report Type Selector */}
            <div style={{display: 'flex', gap: '15px', marginBottom: '25px'}}>
              <button
                onClick={() => setReportType('finance')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: reportType === 'finance' ? '#4CAF50' : '#f5f5f5',
                  color: reportType === 'finance' ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                💰 Finance Report
              </button>
              <button
                onClick={() => setReportType('inventory')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: reportType === 'inventory' ? '#4CAF50' : '#f5f5f5',
                  color: reportType === 'inventory' ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                📦 Inventory Report
              </button>
            </div>

            {reportType === 'finance' && (
              <div>
                {/* Date Filter */}
                <div style={{backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '25px'}}>
                  <h3 style={{marginTop: 0}}>Date Filter</h3>
                  <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                    {['today', 'yesterday', 'week', 'month', 'custom'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDateFilter(filter as any)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: dateFilter === filter ? '#2196F3' : '#fff',
                          color: dateFilter === filter ? '#fff' : '#333',
                          border: '2px solid #2196F3',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textTransform: 'capitalize'
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  
                  {dateFilter === 'custom' && (
                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                      <div>
                        <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>Start Date:</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>End Date:</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Client Filter */}
                <div style={{backgroundColor: '#E8F5E9', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '2px solid #4CAF50'}}>
                  <h3 style={{marginTop: 0, marginBottom: '15px'}}>👤 Filter by Client</h3>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      fontSize: '15px',
                      border: '2px solid #4CAF50',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    <option value="all">All Clients ({sales.filter(s => s.client_id).length} linked sales)</option>
                    {clientsWithPurchases.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.count} sale(s) • Lek {client.total.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {clientFilter !== 'all' && (
                    <button
                      onClick={() => setClientFilter('all')}
                      style={{
                        marginTop: '10px',
                        padding: '8px 15px',
                        backgroundColor: '#fff',
                        color: '#4CAF50',
                        border: '2px solid #4CAF50',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {/* Client Info Banner (if filtered) */}
                {clientFilter !== 'all' && (() => {
                  const selectedClientData = clientsWithPurchases.find(c => c.id === clientFilter);
                  const clientSales = filteredSales.filter(s => s.client_id === clientFilter);
                  
                  return (
                    <div style={{
                      backgroundColor: '#2196F3',
                      padding: '20px',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      color: '#fff'
                    }}>
                      <h2 style={{margin: '0 0 10px 0', color: '#fff'}}>
                        👤 {selectedClientData?.name || 'Unknown Client'}
                      </h2>
                      <div style={{display: 'flex', gap: '30px', fontSize: '15px'}}>
                        <p style={{margin: 0}}>
                          <strong>{clientSales.length}</strong> purchase(s)
                        </p>
                        <p style={{margin: 0}}>
                          <strong>Lek {clientSales.reduce((sum, s) => sum + parseFloat(String(s.total)), 0).toFixed(2)}</strong> total spent
                        </p>
                        <p style={{margin: 0}}>
                          Avg: <strong>Lek {clientSales.length > 0 ? (clientSales.reduce((sum, s) => sum + parseFloat(String(s.total)), 0) / clientSales.length).toFixed(2) : '0.00'}</strong>
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Finance Stats */}
                <div style={{...webStyles.statCard, backgroundColor: '#4CAF50', marginBottom: '30px'}}>
                  <h1 style={{fontSize: '48px', color: '#fff', margin: '20px 0'}}>Lek {filteredRevenue.toFixed(2)}</h1>
                  <p style={{color: '#fff', fontSize: '18px'}}>
                    {clientFilter !== 'all' 
                      ? `${clientsWithPurchases.find(c => c.id === clientFilter)?.name}'s Revenue (${dateFilter})`
                      : `Total Revenue (${dateFilter})`
                    }
                  </p>
                </div>
                
                <div style={webStyles.statsGrid}>
                  <div style={webStyles.metricCard}>
                    <p style={{color: '#666'}}>Sales Count</p>
                    <h2>{filteredSales.length}</h2>
                  </div>
                  <div style={webStyles.metricCard}>
                    <p style={{color: '#666'}}>Average Sale</p>
                    <h2>Lek {filteredSales.length > 0 ? (filteredRevenue / filteredSales.length).toFixed(2) : '0.00'}</h2>
                  </div>
                  <div style={{...webStyles.metricCard, backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800'}}>
                    <p style={{color: '#e65100'}}>Total Cost</p>
                    <h2 style={{color: '#e65100'}}>Lek {filteredCost.toFixed(2)}</h2>
                  </div>
                  <div style={{...webStyles.metricCard, backgroundColor: '#e8f5e9', borderLeft: '4px solid #4CAF50'}}>
                    <p style={{color: '#2e7d32'}}>Total Profit</p>
                    <h2 style={{color: '#2e7d32'}}>Lek {filteredProfit.toFixed(2)}</h2>
                  </div>
                </div>

                {/* Payment Method Breakdown */}
                <h3 style={{marginTop: '40px', marginBottom: '20px'}}>💳 Payment Methods</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '40px'}}>
                  <div style={{...webStyles.metricCard, backgroundColor: '#E8F5E9', borderLeft: '4px solid #4CAF50'}}>
                    <p style={{color: '#2e7d32', fontWeight: '600'}}>💵 Cash</p>
                    <h2 style={{color: '#2e7d32'}}>Lek {paymentBreakdown.cash.toFixed(2)}</h2>
                    <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                      {filteredRevenue > 0 ? ((paymentBreakdown.cash / filteredRevenue) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                  <div style={{...webStyles.metricCard, backgroundColor: '#E3F2FD', borderLeft: '4px solid #2196F3'}}>
                    <p style={{color: '#1976d2', fontWeight: '600'}}>💳 Card</p>
                    <h2 style={{color: '#1976d2'}}>Lek {paymentBreakdown.card.toFixed(2)}</h2>
                    <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                      {filteredRevenue > 0 ? ((paymentBreakdown.card / filteredRevenue) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                  <div style={{...webStyles.metricCard, backgroundColor: '#F3E5F5', borderLeft: '4px solid #9C27B0'}}>
                    <p style={{color: '#7b1fa2', fontWeight: '600'}}>📱 Digital</p>
                    <h2 style={{color: '#7b1fa2'}}>Lek {paymentBreakdown.digital.toFixed(2)}</h2>
                    <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                      {filteredRevenue > 0 ? ((paymentBreakdown.digital / filteredRevenue) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                  <div style={{...webStyles.metricCard, backgroundColor: '#FFF3E0', borderLeft: '4px solid #FF9800'}}>
                    <p style={{color: '#e65100', fontWeight: '600'}}>🏷️ Credit</p>
                    <h2 style={{color: '#e65100'}}>Lek {paymentBreakdown.credit.toFixed(2)}</h2>
                    <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                      {filteredRevenue > 0 ? ((paymentBreakdown.credit / filteredRevenue) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                </div>

                {/* Top Selling Products */}
                <h3 style={{marginTop: '40px', marginBottom: '20px'}}>🏆 Top Selling Products ({dateFilter})</h3>
                {topProducts.length === 0 ? (
                  <p style={{textAlign: 'center', padding: '40px', color: '#999'}}>No sales data available</p>
                ) : (
                  <div style={{backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                    {topProducts.map((product, index) => {
                      const maxRevenue = topProducts[0].revenue;
                      const percentage = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;
                      
                      return (
                        <div key={product.name} style={{
                          padding: '20px',
                          borderBottom: index < topProducts.length - 1 ? '1px solid #f0f0f0' : 'none',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${percentage}%`,
                            backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#E3F2FD',
                            opacity: 0.2,
                            transition: 'width 0.3s ease'
                          }} />
                          <div style={{position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                              <span style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#2196F3',
                                minWidth: '30px'
                              }}>
                                #{index + 1}
                              </span>
                              <div>
                                <p style={{margin: 0, fontWeight: 'bold', fontSize: '16px'}}>{product.name}</p>
                                <p style={{margin: '3px 0 0 0', color: '#666', fontSize: '14px'}}>
                                  Sold: {product.quantity} units
                                </p>
                              </div>
                            </div>
                            <div style={{textAlign: 'right'}}>
                              <p style={{margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#4CAF50'}}>
                                Lek {product.revenue.toFixed(2)}
                              </p>
                              <p style={{margin: '3px 0 0 0', fontSize: '12px', color: '#666'}}>
                                {filteredRevenue > 0 ? ((product.revenue / filteredRevenue) * 100).toFixed(1) : 0}% of revenue
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Client Purchase Details (if specific client selected) */}
                {clientFilter !== 'all' && (() => {
                  const clientSales = filteredSales.filter(s => s.client_id === clientFilter);
                  const selectedClientData = clientsWithPurchases.find(c => c.id === clientFilter);
                  
                  return (
                    <div style={{marginTop: '40px'}}>
                      <h3 style={{marginBottom: '20px'}}>
                        📋 {selectedClientData?.name}'s Purchase History
                      </h3>
                      
                      {clientSales.length === 0 ? (
                        <p style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                          No purchases found for this period
                        </p>
                      ) : (
                        <div style={{backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                          {clientSales.map((sale, index) => (
                            <div key={sale.id} style={{
                              padding: '20px',
                              borderBottom: index < clientSales.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                <div>
                                  <p style={{margin: 0, fontWeight: 'bold', fontSize: '16px'}}>
                                    {new Date(sale.sale_date).toLocaleDateString()} - {new Date(sale.sale_date).toLocaleTimeString()}
                                  </p>
                                  <p style={{margin: '5px 0 0 0', color: '#666', fontSize: '14px'}}>
                                    {sale.table_number} • {sale.payment_method}
                                  </p>
                                </div>
                                <p style={{margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#4CAF50'}}>
                                  Lek {parseFloat(String(sale.total)).toFixed(2)}
                                </p>
                              </div>
                              
                              {sale.items && sale.items.length > 0 && (
                                <div style={{
                                  backgroundColor: '#f8f9fa',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  marginTop: '10px'
                                }}>
                                  <p style={{margin: '0 0 10px 0', fontSize: '13px', fontWeight: '600', color: '#666'}}>
                                    Items:
                                  </p>
                                  {sale.items.map((item: any, idx: number) => (
                                    <div key={idx} style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      padding: '5px 0',
                                      fontSize: '14px'
                                    }}>
                                      <span>{item.quantity}x {item.product_name}</span>
                                      <strong>Lek {item.total?.toFixed(2) || '0.00'}</strong>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {reportType === 'inventory' && (
              <div>
                <h2 style={{marginBottom: '20px'}}>Inventory Status</h2>
                
                {/* Alerts */}
                {outOfStockProducts.length > 0 && (
                  <div style={{
                    backgroundColor: '#ffebee',
                    border: '3px solid #f44336',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{color: '#c62828', marginTop: 0}}>⚠️ Out of Stock ({outOfStockProducts.length})</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                      {outOfStockProducts.map(p => (
                        <div key={p.id} style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px'}}>
                          <strong>{p.name}</strong>
                          <p style={{margin: '5px 0 0 0', color: '#666', fontSize: '13px'}}>{p.category}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lowStockProducts.length > 0 && (
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '3px solid #ff9800',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{color: '#e65100', marginTop: 0}}>⚡ Low Stock - Less than 10 ({lowStockProducts.length})</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px'}}>
                      {lowStockProducts.map(p => (
                        <div key={p.id} style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px'}}>
                          <strong>{p.name}</strong>
                          <p style={{margin: '5px 0 0 0', color: '#666', fontSize: '13px'}}>
                            Stock: {p.stock} • {p.category}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Products Inventory */}
                <h3>All Products</h3>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden'}}>
                    <thead>
                      <tr style={{backgroundColor: '#f5f5f5'}}>
                        <th style={{padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Product</th>
                        <th style={{padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd'}}>Category</th>
                        <th style={{padding: '15px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>Stock</th>
                        <th style={{padding: '15px', textAlign: 'right', borderBottom: '2px solid #ddd'}}>Price</th>
                        <th style={{padding: '15px', textAlign: 'right', borderBottom: '2px solid #ddd'}}>Value</th>
                        <th style={{padding: '15px', textAlign: 'center', borderBottom: '2px solid #ddd'}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                          <td style={{padding: '15px'}}><strong>{p.name}</strong></td>
                          <td style={{padding: '15px', textTransform: 'capitalize'}}>{p.category}</td>
                          <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: p.stock === 0 ? '#f44336' : p.stock < 10 ? '#ff9800' : '#4CAF50'}}>
                            {p.stock}
                          </td>
                          <td style={{padding: '15px', textAlign: 'right'}}>Lek {p.price.toFixed(2)}</td>
                          <td style={{padding: '15px', textAlign: 'right'}}>Lek {(p.stock * p.price).toFixed(2)}</td>
                          <td style={{padding: '15px', textAlign: 'center'}}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: p.stock === 0 ? '#ffebee' : p.stock < 10 ? '#fff3e0' : '#e8f5e9',
                              color: p.stock === 0 ? '#c62828' : p.stock < 10 ? '#e65100' : '#2e7d32'
                            }}>
                              {p.stock === 0 ? 'OUT' : p.stock < 10 ? 'LOW' : 'OK'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Inventory Summary */}
                <div style={{marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px'}}>
                  <div style={webStyles.metricCard}>
                    <p style={{color: '#666'}}>Total Products</p>
                    <h2>{products.length}</h2>
                  </div>
                  <div style={webStyles.metricCard}>
                    <p style={{color: '#666'}}>Total Stock Units</p>
                    <h2>{products.reduce((sum, p) => sum + p.stock, 0)}</h2>
                  </div>
                  <div style={webStyles.metricCard}>
                    <p style={{color: '#666'}}>Total Stock Value</p>
                    <h2>Lek {products.reduce((sum, p) => sum + (p.stock * p.price), 0).toFixed(2)}</h2>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

       {/* TRANSFER TO TABLE MODAL */}
       {showTransferModal && (
         <div style={webStyles.modalOverlay} onClick={() => setShowTransferModal(false)}>
           <div style={{...webStyles.modal, maxWidth: '900px'}} onClick={(e) => e.stopPropagation()}>
             <div style={webStyles.modalHeader}>
               <h2>Transfer to Table</h2>
               <button onClick={() => setShowTransferModal(false)} style={webStyles.closeButton}>✕</button>
             </div>
             <div style={webStyles.modalBody}>
               {/* Client Search Section */}
               <div style={{
                 marginBottom: '25px',
                 padding: '20px',
                 backgroundColor: '#f8f9fa',
                 borderRadius: '8px',
                 border: '2px solid #e0e0e0'
               }}>
                 <h3 style={{margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600'}}>
                   👤 Link to Studio Client (Optional)
                 </h3>
                 <p style={{fontSize: '13px', color: '#666', marginBottom: '15px'}}>
                   Search and select a client to track this purchase in their profile
                 </p>
                 
                 <input
                   type="text"
                   placeholder="Search client by name, email, or phone..."
                   value={clientSearchQuery}
                   onChange={(e) => setClientSearchQuery(e.target.value)}
                   style={{
                     width: '100%',
                     padding: '12px 15px',
                     fontSize: '15px',
                     border: '1px solid #ddd',
                     borderRadius: '8px',
                     marginBottom: '10px',
                     boxSizing: 'border-box'
                   }}
                 />

                 {selectedClient && (
                   <div style={{
                     padding: '15px',
                     backgroundColor: '#E8F5E9',
                     borderRadius: '8px',
                     border: '2px solid #4CAF50',
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center'
                   }}>
                     <div>
                       <p style={{margin: 0, fontWeight: 'bold', color: '#2E7D32'}}>✓ {selectedClient.name}</p>
                       <p style={{margin: '3px 0 0 0', fontSize: '13px', color: '#666'}}>{selectedClient.email}</p>
                     </div>
                     <button
                       onClick={() => {
                         setSelectedClient(null);
                         setClientSearchQuery('');
                       }}
                       style={{
                         padding: '8px 15px',
                         backgroundColor: '#fff',
                         border: '1px solid #4CAF50',
                         borderRadius: '6px',
                         cursor: 'pointer',
                         fontSize: '13px',
                         color: '#4CAF50',
                         fontWeight: '600'
                       }}
                     >
                       Change
                     </button>
                   </div>
                 )}

                 {!selectedClient && clientSearchQuery && (
                   <div style={{
                     maxHeight: '200px',
                     overflowY: 'auto',
                     border: '1px solid #ddd',
                     borderRadius: '8px',
                     backgroundColor: '#fff'
                   }}>
                     {studioClients
                       .filter(client => 
                         client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                         (client.phone && client.phone.includes(clientSearchQuery))
                       )
                       .slice(0, 10)
                       .map(client => (
                         <div
                           key={client.id}
                           onClick={() => {
                             setSelectedClient(client);
                             setClientSearchQuery('');
                           }}
                           style={{
                             padding: '12px 15px',
                             borderBottom: '1px solid #f0f0f0',
                             cursor: 'pointer',
                             transition: 'background-color 0.2s'
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                         >
                           <p style={{margin: 0, fontWeight: '600', fontSize: '14px'}}>{client.name}</p>
                           <p style={{margin: '3px 0 0 0', fontSize: '12px', color: '#666'}}>{client.email}</p>
                         </div>
                       ))}
                   </div>
                 )}
               </div>

               {/* Table Selection */}
               <h3 style={{margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600'}}>
                 Select Table
               </h3>
               <div style={{
                 display: 'grid',
                 gridTemplateColumns: 'repeat(4, 1fr)',
                 gap: '15px',
                 marginBottom: '20px'
               }}>
                 {tables.map(table => (
                   <button
                     key={table.id}
                     onClick={() => transferToTable(table.id)}
                     disabled={table.status === 'occupied'}
                     style={{
                       padding: '25px 15px',
                       backgroundColor: table.status === 'occupied' ? '#f5f5f5' : '#fff',
                       border: table.status === 'occupied' ? '2px dashed #ccc' : '2px solid #4CAF50',
                       borderRadius: '12px',
                       cursor: table.status === 'occupied' ? 'not-allowed' : 'pointer',
                       fontSize: '16px',
                       fontWeight: '600',
                       color: table.status === 'occupied' ? '#999' : '#333',
                       opacity: table.status === 'occupied' ? 0.5 : 1,
                       transition: 'all 0.2s'
                     }}
                   >
                     <div>{table.table_number}</div>
                     <div style={{fontSize: '12px', marginTop: '8px', color: table.status === 'occupied' ? '#f44336' : '#4CAF50'}}>
                       {table.status === 'occupied' ? 'Occupied' : 'Available'}
                     </div>
                   </button>
                 ))}
               </div>

               {/* Order Summary */}
               <div style={{
                 padding: '20px',
                 backgroundColor: '#E3F2FD',
                 borderRadius: '8px',
                 borderLeft: '4px solid #2196F3'
               }}>
                 <p style={{margin: 0, fontSize: '14px', color: '#1976D2'}}>
                   <strong>Total to transfer:</strong> Lek {quickSaleCart.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                 </p>
                 <p style={{margin: '5px 0 0 0', fontSize: '12px', color: '#666'}}>
                   {quickSaleCart.length} item(s)
                 </p>
                 {selectedClient && (
                   <p style={{margin: '8px 0 0 0', fontSize: '13px', color: '#2196F3', fontWeight: '600'}}>
                     ✓ Will be logged to {selectedClient.name}'s profile
                   </p>
                 )}
               </div>
             </div>
           </div>
         </div>
       )}

       {/* WEB MODAL */}
       {showModal && (
         <div style={webStyles.modalOverlay} onClick={closeModal}>
          <div style={webStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={webStyles.modalHeader}>
              <h2>
                {modalType === 'addProduct' && 'Add New Product'}
                {modalType === 'editProduct' && 'Edit Product'}
                {modalType === 'addOrder' && `Add Order - ${selectedTable?.table_number}`}
                {modalType === 'closeTable' && `Close ${selectedTable?.table_number}`}
                {modalType === 'addTable' && 'Add New Table'}
                {modalType === 'editTable' && 'Edit Table'}
                {modalType === 'saleDetails' && 'Sale Details'}
              </h2>
              <button onClick={closeModal} style={webStyles.closeButton}>✕</button>
            </div>

            <div style={webStyles.modalBody}>
              {/* Add/Edit Product Modal */}
              {(modalType === 'addProduct' || modalType === 'editProduct') && (
                <div>
                  <div style={webStyles.inputGroup}>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      style={webStyles.input}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                    <div style={webStyles.inputGroup}>
                      <label>Sell Price (Lek ) *</label>
                      <input
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        style={webStyles.input}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div style={webStyles.inputGroup}>
                      <label>Cost Price (Lek )</label>
                      <input
                        type="number"
                        value={productForm.cost}
                        onChange={(e) => setProductForm({...productForm, cost: e.target.value})}
                        style={webStyles.input}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div style={webStyles.inputGroup}>
                    <label>Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                      style={webStyles.input}
                    >
                      <option value="beverage">Beverage</option>
                      <option value="snack">Snack</option>
                      <option value="accessory">Accessory</option>
                      <option value="supplement">Supplement</option>
                    </select>
                  </div>
                  <div style={webStyles.inputGroup}>
                    <label>Stock</label>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                      style={webStyles.input}
                      placeholder="0"
                    />
                  </div>
                  <div style={webStyles.modalFooter}>
                    <button onClick={closeModal} style={webStyles.cancelButton}>Cancel</button>
                    <button
                      onClick={modalType === 'addProduct' ? handleAddProduct : handleEditProduct}
                      style={webStyles.confirmButton}
                    >
                      {modalType === 'addProduct' ? 'Add Product' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Add Order Modal */}
              {modalType === 'addOrder' && (
                <div>
                  {!selectedProduct ? (
                    <div>
                      <p style={{marginBottom: '15px', fontWeight: 'bold'}}>Select Product:</p>
                      {products.map(product => (
                        <div
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          style={webStyles.productSelectItem}
                        >
                          <div>
                            <p style={{fontWeight: 'bold'}}>{product.name}</p>
                            <p style={{color: '#666'}}>Lek {product.price.toFixed(2)} • Stock: {product.stock}</p>
                          </div>
                          <span>→</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div style={{backgroundColor: '#E3F2FD', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                        <h3>{selectedProduct.name}</h3>
                        <p style={{fontSize: '18px', color: '#2196F3'}}>Lek {selectedProduct.price.toFixed(2)}</p>
                        <button onClick={() => setSelectedProduct(null)} style={{marginTop: '10px', color: '#2196F3', background: 'none', border: 'none', cursor: 'pointer'}}>
                          Change Product
                        </button>
                      </div>
                      <div style={webStyles.inputGroup}>
                        <label>Quantity</label>
                        <input
                          type="number"
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(e.target.value)}
                          style={webStyles.input}
                          min="1"
                        />
                      </div>
                      <div style={webStyles.inputGroup}>
                        <label>Special Instructions / Notes (Optional)</label>
                        <textarea
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          style={{...webStyles.input, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit'}}
                          placeholder="e.g., No ice, extra hot, allergen info..."
                        />
                      </div>
                      <div style={{textAlign: 'center', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px'}}>
                        <p style={{fontSize: '18px'}}>Total: <strong style={{fontSize: '24px', color: '#4CAF50'}}>
                          Lek {(selectedProduct.price * parseInt(orderQuantity || '0')).toFixed(2)}
                        </strong></p>
                      </div>
                      <div style={webStyles.modalFooter}>
                        <button onClick={closeModal} style={webStyles.cancelButton}>Cancel</button>
                        <button onClick={handleAddOrder} style={webStyles.confirmButton}>Add to Table</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Close Table Modal */}
              {modalType === 'closeTable' && selectedTable && (
                <div>
                  {selectedTable.linked_client_name && (
                    <div style={{
                      padding: '15px',
                      backgroundColor: '#E3F2FD',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      border: '2px solid #2196F3'
                    }}>
                      <p style={{margin: 0, fontSize: '15px', color: '#1976D2', fontWeight: '600'}}>
                        👤 Client: {selectedTable.linked_client_name}
                      </p>
                    </div>
                  )}
                  <div style={{backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                    <h3>Order Summary</h3>
                    {selectedTable.orders.map(order => (
                      <div key={order.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0'}}>
                        <span>{order.quantity}x {order.product_name}</span>
                        <strong>Lek {order.total_price.toFixed(2)}</strong>
                      </div>
                    ))}
                    <div style={{borderTop: '2px solid #e0e0e0', marginTop: '15px', paddingTop: '15px', display: 'flex', justifyContent: 'space-between'}}>
                      <strong style={{fontSize: '18px'}}>TOTAL:</strong>
                      <strong style={{fontSize: '20px', color: '#4CAF50'}}>
                        Lek {selectedTable.orders.reduce((sum, o) => sum + o.total_price, 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                  <div style={webStyles.inputGroup}>
                    <label>Payment Method</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                      {['cash', 'card', 'digital'].map(method => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          style={{
                            ...webStyles.paymentButton,
                            backgroundColor: paymentMethod === method ? '#4CAF50' : '#fff',
                            color: paymentMethod === method ? '#fff' : '#666'
                          }}
                        >
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={webStyles.modalFooter}>
                    <button onClick={closeModal} style={webStyles.cancelButton}>Cancel</button>
                    <button onClick={handleCloseTable} style={{...webStyles.confirmButton, backgroundColor: '#4CAF50'}}>
                      Complete Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Add/Edit Table Modal */}
              {(modalType === 'addTable' || modalType === 'editTable') && (
                <div>
                  <div style={webStyles.inputGroup}>
                    <label>Table Number *</label>
                    <input
                      type="text"
                      placeholder="e.g., Table 1, A1, VIP 1"
                      value={tableForm.tableNumber}
                      onChange={(e) => setTableForm({...tableForm, tableNumber: e.target.value})}
                      style={webStyles.input}
                    />
                  </div>
                  <div style={webStyles.inputGroup}>
                    <label>Capacity (People) *</label>
                    <input
                      type="number"
                      placeholder="4"
                      value={tableForm.capacity}
                      onChange={(e) => setTableForm({...tableForm, capacity: e.target.value})}
                      style={webStyles.input}
                    />
                  </div>
                  <div style={webStyles.modalFooter}>
                    <button onClick={closeModal} style={webStyles.cancelButton}>Cancel</button>
                    <button 
                      onClick={modalType === 'addTable' ? handleAddTable : handleEditTable} 
                      style={webStyles.confirmButton}
                    >
                      {modalType === 'addTable' ? 'Add Table' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sale Details Modal */}
              {modalType === 'saleDetails' && selectedSale && (
                <div>
                  <div style={{backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                      <div>
                        <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '13px'}}>Table</p>
                        <p style={{margin: 0, fontSize: '16px', fontWeight: 'bold'}}>{selectedSale.table_number}</p>
                      </div>
                      <div>
                        <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '13px'}}>Date & Time</p>
                        <p style={{margin: 0, fontSize: '16px', fontWeight: 'bold'}}>{new Date(selectedSale.sale_date).toLocaleString()}</p>
                      </div>
                      <div>
                        <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '13px'}}>Payment Method</p>
                        <p style={{margin: 0, fontSize: '16px', fontWeight: 'bold', textTransform: 'capitalize'}}>{selectedSale.payment_method}</p>
                      </div>
                      <div>
                        <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '13px'}}>Status</p>
                        <p style={{margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#4CAF50', textTransform: 'capitalize'}}>{selectedSale.payment_status}</p>
                      </div>
                      {selectedSale.client_name && (
                        <div style={{gridColumn: '1 / -1'}}>
                          <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '13px'}}>Client</p>
                          <p style={{margin: 0, fontSize: '16px', fontWeight: 'bold'}}>{selectedSale.client_name}</p>
                        </div>
                      )}
                    </div>

                    <h3 style={{marginTop: '20px', marginBottom: '10px'}}>Order Items</h3>
                    <div style={{backgroundColor: '#fff', borderRadius: '8px', padding: '15px'}}>
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((item: any, index: number) => (
                          <div key={index} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '12px 0',
                            borderBottom: index < selectedSale.items.length - 1 ? '1px solid #eee' : 'none'
                          }}>
                            <div>
                              <p style={{margin: 0, fontWeight: 'bold'}}>{item.product_name}</p>
                              <p style={{margin: '3px 0 0 0', color: '#666', fontSize: '13px'}}>
                                {item.quantity} x Lek {item.unit_price?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            <strong style={{color: '#4CAF50'}}>Lek {item.total?.toFixed(2) || '0.00'}</strong>
                          </div>
                        ))
                      ) : (
                        <p style={{margin: 0, color: '#999', textAlign: 'center'}}>No items</p>
                      )}
                      
                      <div style={{
                        borderTop: '2px solid #e0e0e0',
                        marginTop: '15px',
                        paddingTop: '15px',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <strong style={{fontSize: '18px'}}>TOTAL:</strong>
                        <strong style={{fontSize: '24px', color: '#4CAF50'}}>
                          Lek {parseFloat(String(selectedSale.total)).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                  
                  <div style={webStyles.modalFooter}>
                    <button onClick={closeModal} style={{...webStyles.confirmButton, width: '100%'}}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// WEB STYLES (CSS-like for PC)
const webStyles: any = {
  container: {
    width: '100%',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#fff',
    padding: '20px 30px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    color: '#333',
  },
  tabs: {
    backgroundColor: '#fff',
    display: 'flex',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '15px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
  },
  tabActive: {
    borderBottomColor: '#D4B08A',
    backgroundColor: '#f8f5f0',
    color: '#D4B08A',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '10px 0',
  },
  statLabel: {
    color: '#fff',
    opacity: 0.9,
    fontSize: '14px',
  },
  toolbar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '25px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 15px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  productCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  productHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px',
  },
  productName: {
    margin: '0 0 5px 0',
    fontSize: '18px',
  },
  productCategory: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
    textTransform: 'capitalize',
  },
  iconButton: {
    padding: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  productDetails: {
    fontSize: '14px',
    lineHeight: '1.8',
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
  },
  tableCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #e0e0e0',
    cursor: 'pointer',
    textAlign: 'center',
  },
  tableBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '10px',
  },
  tablePanel: {
    flex: 1,
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '400px',
  },
  primaryButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  orderItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  tableTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #e0e0e0',
  },
  saleCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  paymentBadge: {
    display: 'inline-block',
    backgroundColor: '#E3F2FD',
    color: '#2196F3',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px 30px',
    borderBottom: '1px solid #e0e0e0',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  modalBody: {
    padding: '30px',
    overflowY: 'auto',
    flex: 1,
  },
  inputGroup: {
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginTop: '8px',
    boxSizing: 'border-box',
  },
  productSelectItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  paymentButton: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
  },
  modalFooter: {
    display: 'flex',
    gap: '15px',
    marginTop: '25px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#fff',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Add CSS animation for refresh button
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('[data-animation="spin"]')) {
    style.setAttribute('data-animation', 'spin');
    document.head.appendChild(style);
  }
}

