import { getDb } from './db';

// Email templates
export const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: 'order_confirmation',
  DELIVERY_UPDATE: 'delivery_update',
  LOW_STOCK_ALERT: 'low_stock_alert',
  PRICE_CHANGE: 'price_change',
  NEW_PRODUCT: 'new_product',
  WEEKLY_SUMMARY: 'weekly_summary',
  INVOICE_REMINDER: 'invoice_reminder',
  QUALITY_ISSUE: 'quality_issue'
};

export interface EmailData {
  to: Array<{ email: string; name?: string }>;
  from: { email: string; name: string };
  subject: string;
  templateId?: string;
  templateData?: Record<string, any>;
  text?: string;
  html?: string;
}

// MailTrap MCP integration
export class MailTrapService {
  private mcpEndpoint: string;
  
  constructor() {
    // Using the MCP server endpoint
    this.mcpEndpoint = process.env.MAILTRAP_MCP_URL || 'http://localhost:3006';
  }
  
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.mcpEndpoint}/tools/mailtrap_send_email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html
        })
      });
      
      if (!response.ok) {
        throw new Error(`MailTrap API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Log email in database
      const db = await getDb();
      await db.run(`
        INSERT INTO email_logs (
          recipient_email, 
          sender_email, 
          subject, 
          status, 
          mcp_message_id,
          sent_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [
        emailData.to[0].email,
        emailData.from.email,
        emailData.subject,
        'sent',
        result.message_id
      ]);
      
      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('Email sending error:', error);
      
      // Log failed email
      const db = await getDb();
      await db.run(`
        INSERT INTO email_logs (
          recipient_email, 
          sender_email, 
          subject, 
          status, 
          error_message
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        emailData.to[0].email,
        emailData.from.email,
        emailData.subject,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      ]);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  }
  
  async sendTemplateEmail(
    templateId: string,
    to: Array<{ email: string; name?: string }>,
    templateData: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.mcpEndpoint}/tools/mailtrap_send_template_email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_uuid: templateId,
          to,
          from: {
            email: 'noreply@ronisbakery.com',
            name: "Roni's Bakery"
          },
          template_variables: templateData
        })
      });
      
      if (!response.ok) {
        throw new Error(`MailTrap API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Log email in database
      const db = await getDb();
      await db.run(`
        INSERT INTO email_logs (
          recipient_email, 
          sender_email, 
          template_name,
          status, 
          mcp_message_id,
          sent_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [
        to[0].email,
        'noreply@ronisbakery.com',
        templateId,
        'sent',
        result.message_id
      ]);
      
      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error('Template email sending error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send template email' 
      };
    }
  }
}

// Email notification functions
export async function sendOrderConfirmation(orderId: number): Promise<boolean> {
  const db = await getDb();
  const mailService = new MailTrapService();
  
  // Get order details
  const order = await db.get(`
    SELECT 
      po.*,
      s.name as supplier_name,
      s.email as supplier_email,
      s.contact as supplier_contact,
      t.name as tenant_name,
      u.name as ordered_by_name,
      u.email as ordered_by_email
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN tenants t ON po.tenant_id = t.id
    LEFT JOIN users u ON po.created_by = u.id
    WHERE po.id = ?
  `, [orderId]);
  
  if (!order) return false;
  
  // Get order items
  const items = await db.all(`
    SELECT 
      oi.*,
      p.name as product_name,
      p.unit
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [orderId]);
  
  // Build email content
  const emailContent = `
    <h2>New Purchase Order #${orderId}</h2>
    <p>Dear ${order.supplier_contact || order.supplier_name},</p>
    <p>We have placed a new order with your company. Please find the details below:</p>
    
    <h3>Order Details:</h3>
    <ul>
      <li><strong>Order Number:</strong> #${orderId}</li>
      <li><strong>Order Date:</strong> ${new Date(order.order_date).toLocaleDateString()}</li>
      <li><strong>Customer:</strong> ${order.tenant_name}</li>
      <li><strong>Total Amount:</strong> £${order.total_cost.toFixed(2)}</li>
    </ul>
    
    <h3>Items Ordered:</h3>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Product</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
      ${items.map(item => `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.quantity} ${item.unit}</td>
          <td>£${item.unit_price.toFixed(2)}</td>
          <td>£${(item.quantity * item.unit_price).toFixed(2)}</td>
        </tr>
      `).join('')}
    </table>
    
    <p><strong>Delivery Instructions:</strong> ${order.notes || 'Standard delivery'}</p>
    
    <p>Please confirm receipt of this order and provide an estimated delivery date.</p>
    
    <p>Best regards,<br>${order.tenant_name}</p>
  `;
  
  const result = await mailService.sendEmail({
    to: [{ email: order.supplier_email, name: order.supplier_name }],
    from: { email: 'orders@ronisbakery.com', name: order.tenant_name },
    subject: `New Purchase Order #${orderId} - ${order.tenant_name}`,
    html: emailContent,
    text: emailContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
  });
  
  // Also send copy to the person who created the order
  if (order.ordered_by_email) {
    await mailService.sendEmail({
      to: [{ email: order.ordered_by_email, name: order.ordered_by_name }],
      from: { email: 'noreply@ronisbakery.com', name: 'Roni\'s Bakery System' },
      subject: `Order Confirmation #${orderId} - Sent to ${order.supplier_name}`,
      html: `<p>Your order #${orderId} has been sent to ${order.supplier_name}.</p>${emailContent}`,
      text: `Your order #${orderId} has been sent to ${order.supplier_name}.`
    });
  }
  
  return result.success;
}

export async function sendLowStockAlert(productId: number): Promise<boolean> {
  const db = await getDb();
  const mailService = new MailTrapService();
  
  // Get product details
  const product = await db.get(`
    SELECT 
      p.*,
      t.name as tenant_name,
      t.primary_contact_email
    FROM products p
    JOIN tenants t ON p.tenant_id = t.id
    WHERE p.id = ?
  `, [productId]);
  
  if (!product) return false;
  
  // Get alternative suppliers
  const suppliers = await db.all(`
    SELECT 
      s.name,
      spp.price,
      spp.quality_score
    FROM supplier_product_pricing spp
    JOIN suppliers s ON spp.supplier_id = s.id
    WHERE spp.product_id = ?
    ORDER BY spp.price ASC
    LIMIT 3
  `, [productId]);
  
  const emailContent = `
    <h2>Low Stock Alert - ${product.name}</h2>
    <p>This is an automated alert to inform you that the following product is running low:</p>
    
    <h3>Product Details:</h3>
    <ul>
      <li><strong>Product:</strong> ${product.name}</li>
      <li><strong>Current Stock:</strong> ${product.current_stock} ${product.unit}</li>
      <li><strong>Reorder Point:</strong> ${product.reorder_point} ${product.unit}</li>
      <li><strong>Daily Usage:</strong> ${product.daily_usage} ${product.unit}</li>
      <li><strong>Estimated Days Until Stockout:</strong> ${Math.floor(product.current_stock / product.daily_usage)}</li>
    </ul>
    
    <h3>Available Suppliers:</h3>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Supplier</th>
        <th>Price per ${product.unit}</th>
        <th>Quality Score</th>
      </tr>
      ${suppliers.map(s => `
        <tr>
          <td>${s.name}</td>
          <td>£${s.price.toFixed(2)}</td>
          <td>${s.quality_score}/10</td>
        </tr>
      `).join('')}
    </table>
    
    <p><a href="http://localhost:3003/dashboard/inventory">Click here to place an order</a></p>
  `;
  
  const result = await mailService.sendEmail({
    to: [{ 
      email: product.primary_contact_email || 'owner@ronisbakery.com', 
      name: product.tenant_name 
    }],
    from: { email: 'alerts@ronisbakery.com', name: 'Inventory Management System' },
    subject: `Low Stock Alert: ${product.name}`,
    html: emailContent,
    text: emailContent.replace(/<[^>]*>/g, '')
  });
  
  return result.success;
}

export async function sendWeeklySummary(tenantId: number): Promise<boolean> {
  const db = await getDb();
  const mailService = new MailTrapService();
  
  // Get tenant details
  const tenant = await db.get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  if (!tenant) return false;
  
  // Get week's orders
  const weekOrders = await db.all(`
    SELECT COUNT(*) as count, SUM(total_cost) as total
    FROM purchase_orders
    WHERE tenant_id = ? AND order_date >= date('now', '-7 days')
  `, [tenantId]);
  
  // Get potential savings
  const savingsData = await db.all(`
    SELECT 
      p.name,
      p.price as current_price,
      MIN(spp.price) as best_price,
      (p.price - MIN(spp.price)) * p.daily_usage * 7 as weekly_savings
    FROM products p
    JOIN supplier_product_pricing spp ON p.id = spp.product_id
    WHERE p.tenant_id = ?
    GROUP BY p.id
    HAVING weekly_savings > 0
    ORDER BY weekly_savings DESC
    LIMIT 5
  `, [tenantId]);
  
  const totalPotentialSavings = savingsData.reduce((sum, item) => sum + item.weekly_savings, 0);
  
  const emailContent = `
    <h2>Weekly Summary - ${tenant.name}</h2>
    <p>Here's your weekly business summary for the past 7 days:</p>
    
    <h3>Order Summary:</h3>
    <ul>
      <li><strong>Total Orders:</strong> ${weekOrders[0].count}</li>
      <li><strong>Total Spent:</strong> £${weekOrders[0].total?.toFixed(2) || '0.00'}</li>
    </ul>
    
    <h3>Potential Cost Savings:</h3>
    <p>You could save up to <strong>£${totalPotentialSavings.toFixed(2)}</strong> per week by optimizing suppliers:</p>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Product</th>
        <th>Current Price</th>
        <th>Best Price</th>
        <th>Weekly Savings</th>
      </tr>
      ${savingsData.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>£${item.current_price.toFixed(2)}</td>
          <td>£${item.best_price.toFixed(2)}</td>
          <td>£${item.weekly_savings.toFixed(2)}</td>
        </tr>
      `).join('')}
    </table>
    
    <p><a href="http://localhost:3003/dashboard">View Full Dashboard</a></p>
  `;
  
  const result = await mailService.sendEmail({
    to: [{ 
      email: tenant.primary_contact_email, 
      name: tenant.name 
    }],
    from: { email: 'reports@ronisbakery.com', name: 'Business Intelligence' },
    subject: `Weekly Summary - ${tenant.name}`,
    html: emailContent,
    text: emailContent.replace(/<[^>]*>/g, '')
  });
  
  return result.success;
}