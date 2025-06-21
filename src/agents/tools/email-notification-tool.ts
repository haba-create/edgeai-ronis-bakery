import { logger } from '@/utils/logger';
import { MailTrapService } from '@/utils/email-service';

interface EmailContext {
  userId: string;
  userRole: string;
  tenantId?: number;
  db: any;
}

// Email templates for different scenarios
const EMAIL_TEMPLATES = {
  order_confirmation: {
    subject: 'Order Confirmation - Order #{orderNumber}',
    template: `
      <h2>Order Confirmed</h2>
      <p>Dear {customerName},</p>
      <p>Your order #{orderNumber} has been confirmed and is being processed.</p>
      <h3>Order Details:</h3>
      <ul>
        <li>Order Total: £{orderTotal}</li>
        <li>Expected Delivery: {deliveryDate}</li>
        <li>Supplier: {supplierName}</li>
      </ul>
      <p>You will receive another email when your order is shipped.</p>
      <p>Best regards,<br>Roni's Bakery Team</p>
    `
  },
  low_stock_alert: {
    subject: 'Low Stock Alert - Immediate Action Required',
    template: `
      <h2>Low Stock Alert</h2>
      <p>The following items are running low on stock:</p>
      <table border="1" cellpadding="5">
        <tr>
          <th>Product</th>
          <th>Current Stock</th>
          <th>Reorder Point</th>
          <th>Suggested Order Qty</th>
        </tr>
        {stockItems}
      </table>
      <p>Please review and place orders as needed.</p>
    `
  },
  delivery_notification: {
    subject: 'Delivery Update - Order #{orderNumber}',
    template: `
      <h2>Delivery Update</h2>
      <p>Dear {customerName},</p>
      <p>Your order #{orderNumber} status has been updated:</p>
      <p><strong>Status: {status}</strong></p>
      <p>{statusMessage}</p>
      {trackingInfo}
      <p>Thank you for your business!</p>
    `
  },
  supplier_order: {
    subject: 'New Purchase Order - PO#{poNumber}',
    template: `
      <h2>New Purchase Order</h2>
      <p>Dear {supplierName},</p>
      <p>We have placed a new order with you:</p>
      <h3>Order Details:</h3>
      <ul>
        <li>PO Number: {poNumber}</li>
        <li>Order Date: {orderDate}</li>
        <li>Total Amount: £{totalAmount}</li>
      </ul>
      <h3>Items Ordered:</h3>
      <table border="1" cellpadding="5">
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
        {orderItems}
      </table>
      <p>Please confirm receipt of this order.</p>
      <p>Best regards,<br>Roni's Bakery Purchasing Team</p>
    `
  }
};

export const emailNotificationTool = {
  name: "send_email_notification",
  description: `Send email notifications for various events like order confirmations, 
    low stock alerts, delivery updates, etc. Can use predefined templates or custom content.`,
  parameters: {
    type: "object",
    properties: {
      to: { 
        type: "string", 
        description: "Recipient email address" 
      },
      template_type: {
        type: "string",
        enum: ["order_confirmation", "low_stock_alert", "delivery_notification", "supplier_order", "custom"],
        description: "Type of email template to use"
      },
      subject: {
        type: "string",
        description: "Email subject (required for custom emails, optional for templates)"
      },
      body: {
        type: "string",
        description: "Email body content (required for custom emails)"
      },
      template_data: {
        type: "object",
        description: "Data to fill in template placeholders",
        properties: {
          orderNumber: { type: "string" },
          customerName: { type: "string" },
          orderTotal: { type: "number" },
          deliveryDate: { type: "string" },
          supplierName: { type: "string" },
          status: { type: "string" },
          statusMessage: { type: "string" },
          poNumber: { type: "string" },
          orderDate: { type: "string" },
          totalAmount: { type: "number" }
        }
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "CC recipients (optional)"
      }
    },
    required: ["to", "template_type"]
  }
};

/**
 * Replace template placeholders with actual data
 */
function fillTemplate(template: string, data: Record<string, any>): string {
  let filled = template;
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    filled = filled.replace(placeholder, String(value));
  }
  
  return filled;
}

/**
 * Generate email content based on database query results
 */
async function generateEmailContent(
  templateType: string, 
  templateData: any, 
  context: EmailContext
): Promise<{ subject: string; body: string }> {
  const template = EMAIL_TEMPLATES[templateType as keyof typeof EMAIL_TEMPLATES];
  
  if (!template) {
    throw new Error(`Unknown template type: ${templateType}`);
  }
  
  let subject = template.subject;
  let body = template.template;
  
  // Special handling for dynamic content
  if (templateType === 'low_stock_alert' && templateData.products) {
    const stockRows = templateData.products.map((p: any) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.current_stock} ${p.unit}</td>
        <td>${p.reorder_point} ${p.unit}</td>
        <td>${p.order_quantity} ${p.unit}</td>
      </tr>
    `).join('');
    
    body = body.replace('{stockItems}', stockRows);
  } else if (templateType === 'supplier_order' && templateData.items) {
    const itemRows = templateData.items.map((item: any) => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.quantity}</td>
        <td>£${item.unit_price}</td>
        <td>£${item.total}</td>
      </tr>
    `).join('');
    
    body = body.replace('{orderItems}', itemRows);
  }
  
  // Fill in remaining placeholders
  subject = fillTemplate(subject, templateData);
  body = fillTemplate(body, templateData);
  
  return { subject, body };
}

/**
 * Send email notification with role-based access control
 */
export async function sendEmailNotification(
  args: any, 
  context: EmailContext
): Promise<any> {
  const { 
    to, 
    template_type, 
    subject: customSubject, 
    body: customBody, 
    template_data,
    cc 
  } = args;
  
  logger.info('Email notification requested', {
    userId: context.userId,
    userRole: context.userRole,
    to,
    template_type
  });
  
  try {
    let emailSubject: string;
    let emailBody: string;
    
    if (template_type === 'custom') {
      if (!customSubject || !customBody) {
        throw new Error('Custom emails require both subject and body');
      }
      emailSubject = customSubject;
      emailBody = customBody;
    } else {
      // Generate email from template
      const generated = await generateEmailContent(template_type, template_data || {}, context);
      emailSubject = customSubject || generated.subject;
      emailBody = generated.body;
    }
    
    // Initialize email service
    const emailService = new MailTrapService();
    
    // Send the email
    const result = await emailService.sendEmail({
      to,
      cc,
      subject: emailSubject,
      html: emailBody,
      category: template_type,
      metadata: {
        sent_by: context.userRole,
        user_id: context.userId,
        tenant_id: context.tenantId
      }
    });
    
    // Log email to database
    if (context.db) {
      await context.db.run(`
        INSERT INTO email_logs (
          tenant_id, 
          email_type, 
          recipient_email, 
          subject, 
          status, 
          mailtrap_message_id,
          sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        context.tenantId || 1,
        template_type,
        to,
        emailSubject,
        result.success ? 'sent' : 'failed',
        result.messageId || null
      ]);
    }
    
    logger.info('Email sent successfully', {
      userId: context.userId,
      userRole: context.userRole,
      messageId: result.messageId,
      to
    });
    
    return {
      success: true,
      messageId: result.messageId,
      to,
      subject: emailSubject,
      template_type,
      message: `Email sent successfully to ${to}`
    };
    
  } catch (error) {
    logger.error('Email notification failed', {
      userId: context.userId,
      userRole: context.userRole,
      to,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Log failure to database
    if (context.db) {
      await context.db.run(`
        INSERT INTO email_logs (
          tenant_id, 
          email_type, 
          recipient_email, 
          subject, 
          status, 
          error_message,
          sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        context.tenantId || 1,
        template_type,
        to,
        customSubject || 'Failed to send',
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      ]);
    }
    
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get email history for audit/debugging
 */
export async function getEmailHistory(context: EmailContext, filters?: any) {
  const { tenant_id, email_type, status, limit = 50 } = filters || {};
  
  let query = `
    SELECT * FROM email_logs 
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (tenant_id) {
    query += ' AND tenant_id = ?';
    params.push(tenant_id);
  }
  
  if (email_type) {
    query += ' AND email_type = ?';
    params.push(email_type);
  }
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY sent_at DESC LIMIT ?';
  params.push(limit);
  
  return await context.db.all(query, params);
}