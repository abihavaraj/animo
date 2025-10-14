// Import both studio and bar Supabase clients
import { barSupabase, isBarConfigured } from '../config/supabase.bar.config';
import { supabase as studioSupabase } from '../config/supabase.config';

// Use bar database if configured, otherwise fallback to studio database
const supabase = isBarConfigured() ? barSupabase : studioSupabase;

// Types
export interface BarProduct {
  id: number;
  name: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  image_url?: string;
  description?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarTable {
  id: number;
  table_number: string;
  status: 'available' | 'occupied' | 'reserved';
  capacity: number;
  opened_at?: string;
  linked_client_id?: string;
  linked_client_name?: string;
  created_at: string;
  updated_at: string;
}

export interface BarOrder {
  id: number;
  table_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'served' | 'cancelled';
  notes?: string;
  ordered_at: string;
  created_at: string;
}

export interface BarSale {
  id: number;
  table_number: string;
  table_id?: number;
  client_id?: string;
  client_name?: string;
  items: any[]; // JSONB array
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'digital' | 'credit';
  payment_status: 'pending' | 'completed' | 'refunded';
  served_by_staff_id?: string;
  served_by_staff_name?: string;
  sale_date: string;
  notes?: string;
  created_at: string;
}

export interface TableWithOrders extends BarTable {
  items_count?: number;
  current_total?: number;
}

class BarService {
  // ==================== PRODUCTS ====================
  
  async getAllProducts(): Promise<BarProduct[]> {
    try {
      const { data, error } = await supabase
        .from('bar_products')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getAvailableProducts(): Promise<BarProduct[]> {
    try {
      const { data, error } = await supabase
        .from('bar_products')
        .select('*')
        .eq('is_available', true)
        .gt('stock', 0)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching available products:', error);
      return [];
    }
  }

  async addProduct(product: Omit<BarProduct, 'id' | 'created_at' | 'updated_at'>): Promise<BarProduct | null> {
    try {
      const { data, error } = await supabase
        .from('bar_products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding product:', error);
      return null;
    }
  }

  async updateProduct(id: number, updates: Partial<BarProduct>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bar_products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      return false;
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bar_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  async updateStock(productId: number, newStock: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bar_products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating stock:', error);
      return false;
    }
  }

  // ==================== TABLES ====================
  
  async getAllTables(): Promise<TableWithOrders[]> {
    try {
      // Query bar_tables directly instead of view to avoid caching issues
      const { data, error } = await supabase
        .from('bar_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (error) throw error;
      
      // Debug: Log tables with linked clients
      const tablesWithClients = data?.filter(t => t.linked_client_name) || [];
      if (tablesWithClients.length > 0) {
        console.log('📋 Tables with linked clients:', tablesWithClients.map(t => ({
          table: t.table_number,
          client: t.linked_client_name,
          status: t.status
        })));
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
  }

  async getTableById(id: number): Promise<BarTable | null> {
    try {
      const { data, error } = await supabase
        .from('bar_tables')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching table:', error);
      return null;
    }
  }

  async updateTableStatus(
    tableId: number, 
    status: 'available' | 'occupied' | 'reserved',
    clientId?: string,
    clientName?: string
  ): Promise<boolean> {
    try {
      const updates: any = { 
        status,
        opened_at: status === 'occupied' ? new Date().toISOString() : null,
        // Always clear client info when setting to available
        linked_client_id: status === 'available' ? null : (clientId || null),
        linked_client_name: status === 'available' ? null : (clientName || null)
      };

      console.log(`🔄 Updating table ${tableId}:`, {
        status,
        clientId: clientId || 'none',
        clientName: clientName || 'none'
      });

      const { error } = await supabase
        .from('bar_tables')
        .update(updates)
        .eq('id', tableId);

      if (error) {
        console.error('Supabase error updating table status:', error);
        throw error;
      }
      
      console.log(`✅ Table ${tableId} status updated to ${status}`, clientName ? `with client: ${clientName}` : '');
      return true;
    } catch (error) {
      console.error('Error updating table status:', error);
      return false;
    }
  }

  // ==================== ORDERS ====================
  
  async getTableOrders(tableId: number): Promise<BarOrder[]> {
    try {
      const { data, error } = await supabase
        .from('bar_orders')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching table orders:', error);
      return [];
    }
  }

  async addOrderToTable(
    tableId: number,
    productId: number,
    productName: string,
    quantity: number,
    unitPrice: number,
    notes?: string
  ): Promise<BarOrder | null> {
    try {
      const totalPrice = quantity * unitPrice;

      // Prepare order data - only include notes if the field exists
      const orderData: any = {
        table_id: tableId,
        product_id: productId,
        product_name: productName,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        status: 'pending'
      };

      // Only add notes if provided (to avoid column errors if field doesn't exist)
      if (notes) {
        orderData.notes = notes;
      }

      const { data, error } = await supabase
        .from('bar_orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Get current table info to preserve client data
      const table = await this.getTableById(tableId);
      
      // Update table status to occupied, preserving existing client info
      await this.updateTableStatus(
        tableId, 
        'occupied', 
        table?.linked_client_id, 
        table?.linked_client_name
      );

      return data;
    } catch (error) {
      console.error('Error adding order:', error);
      return null;
    }
  }

  async removeOrderFromTable(orderId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bar_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing order:', error);
      return false;
    }
  }

  // ==================== SALES ====================
  
  async closeTableAndCreateSale(
    tableId: number,
    paymentMethod: 'cash' | 'card' | 'digital' | 'credit',
    staffId?: string,
    staffName?: string,
    discount: number = 0,
    notes?: string
  ): Promise<BarSale | null> {
    try {
      console.log(`🔄 Starting close table process for table ${tableId}`);
      
      // 1. Get table info
      const table = await this.getTableById(tableId);
      if (!table) {
        console.error('❌ Table not found:', tableId);
        throw new Error('Table not found');
      }
      console.log(`✅ Table found:`, table.table_number);

      // 2. Get all pending orders for this table
      const orders = await this.getTableOrders(tableId);
      console.log(`📋 Found ${orders.length} orders for table ${tableId}`);
      
      if (orders.length === 0) {
        console.error('❌ No orders to close');
        throw new Error('No orders to close');
      }

      // 3. Calculate totals
      const subtotal = orders.reduce((sum, order) => sum + order.total_price, 0);
      const total = subtotal - discount;
      console.log(`💰 Total: Lek ${total.toFixed(2)} (subtotal: Lek ${subtotal.toFixed(2)}, discount: Lek ${discount})`);

      // 4. Create sale record
      console.log(`💾 Creating sale record...`);
      const { data: sale, error: saleError } = await supabase
        .from('bar_sales')
        .insert([{
          table_number: table.table_number,
          table_id: tableId,
          client_id: table.linked_client_id,
          client_name: table.linked_client_name,
          items: orders.map(order => ({
            product_name: order.product_name,
            quantity: order.quantity,
            unit_price: order.unit_price,
            total: order.total_price
          })),
          subtotal,
          discount,
          total,
          payment_method: paymentMethod,
          payment_status: 'completed',
          served_by_staff_id: staffId,
          served_by_staff_name: staffName,
          notes
        }])
        .select()
        .single();

      if (saleError) {
        console.error('❌ Error creating sale:', saleError);
        throw saleError;
      }
      console.log(`✅ Sale created with ID:`, sale?.id);

      // 5. Mark orders as served
      console.log(`📝 Marking orders as served...`);
      const { error: updateError } = await supabase
        .from('bar_orders')
        .update({ status: 'served' })
        .eq('table_id', tableId)
        .eq('status', 'pending');

      if (updateError) {
        console.error('❌ Error marking orders as served:', updateError);
      } else {
        console.log(`✅ Orders marked as served`);
      }

      // 6. Update table to available
      console.log(`🔓 Setting table to available...`);
      const tableUpdated = await this.updateTableStatus(tableId, 'available');
      if (!tableUpdated) {
        console.error('❌ Failed to update table status');
      }

      // 7. Deduct stock for sold items
      console.log(`📦 Deducting stock...`);
      for (const order of orders) {
        const { data: product } = await supabase
          .from('bar_products')
          .select('stock')
          .eq('id', order.product_id)
          .single();

        if (product) {
          await this.updateStock(order.product_id, product.stock - order.quantity);
          console.log(`✅ Stock updated for product ${order.product_id}`);
        }
      }

      console.log(`✅ Table ${tableId} closed successfully!`);
      return sale;
    } catch (error) {
      console.error('❌ Error closing table:', error);
      return null;
    }
  }

  async getSales(limit: number = 50): Promise<BarSale[]> {
    try {
      const { data, error } = await supabase
        .from('bar_sales')
        .select('*')
        .order('sale_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
  }

  async getTodaySales(): Promise<BarSale[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bar_sales')
        .select('*')
        .gte('sale_date', today)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching today sales:', error);
      return [];
    }
  }

  async getSalesStats(period: 'today' | 'week' | 'month') {
    try {
      let startDate = new Date();
      
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data, error } = await supabase
        .from('bar_sales')
        .select('total, items')
        .gte('sale_date', startDate.toISOString());

      if (error) throw error;

      const totalRevenue = data?.reduce((sum, sale) => sum + parseFloat(sale.total.toString()), 0) || 0;
      const totalSales = data?.length || 0;
      const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

      return {
        totalRevenue,
        totalSales,
        avgSale
      };
    } catch (error) {
      console.error('Error fetching sales stats:', error);
      return { totalRevenue: 0, totalSales: 0, avgSale: 0 };
    }
  }

  // ==================== TRANSFER TO TABLE ====================
  
  async transferCartToTable(
    tableId: number,
    cartItems: Array<{productId: number, productName: string, quantity: number, unitPrice: number}>,
    clientId?: string,
    clientName?: string
  ): Promise<boolean> {
    try {
      // 1. Update table status and link client
      await this.updateTableStatus(tableId, 'occupied', clientId, clientName);

      // 2. Add each cart item as an order
      for (const item of cartItems) {
        await this.addOrderToTable(
          tableId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice
        );
      }

      return true;
    } catch (error) {
      console.error('Error transferring cart to table:', error);
      return false;
    }
  }
}

export const barService = new BarService();

