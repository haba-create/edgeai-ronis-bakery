/**
 * UI Chatbot Testing API using Puppeteer
 * Simulates real browser interactions with chatbot interfaces
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import { logger } from '@/utils/logger';

interface UITestScenario {
  role: string;
  loginUrl: string;
  chatbotSelector: string;
  testMessage: string;
  expectedElementSelector?: string;
  description: string;
}

interface UITestResult {
  scenario: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  screenshot?: string;
  duration: number;
  errors?: string[];
}

interface UITestResponse {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: UITestResult[];
  timestamp: string;
}

const UI_TEST_SCENARIOS: UITestScenario[] = [
  {
    role: 'admin',
    loginUrl: 'http://localhost:3001/apps/admin',
    chatbotSelector: '[data-testid="admin-chatbot"]',
    testMessage: 'Show me the system status',
    description: 'Admin chatbot UI interaction'
  },
  {
    role: 'owner',
    loginUrl: 'http://localhost:3001/apps/owner',
    chatbotSelector: '[data-testid="owner-chatbot"]',
    testMessage: 'Check my inventory levels',
    description: 'Owner chatbot UI interaction'
  },
  {
    role: 'supplier',
    loginUrl: 'http://localhost:3001/apps/supplier',
    chatbotSelector: '[data-testid="supplier-chatbot"]',
    testMessage: 'Show pending orders',
    description: 'Supplier chatbot UI interaction'
  },
  {
    role: 'driver',
    loginUrl: 'http://localhost:3001/apps/driver',
    chatbotSelector: '[data-testid="driver-chatbot"]',
    testMessage: 'Show my deliveries today',
    description: 'Driver chatbot UI interaction'
  }
];

async function runUITest(scenario: UITestScenario): Promise<UITestResult> {
  const startTime = Date.now();
  let browser;
  let screenshot: string | undefined;

  try {
    logger.info('Starting UI test', { 
      role: scenario.role, 
      description: scenario.description 
    });

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to the role-specific page
    await page.goto(scenario.loginUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Look for chatbot interface - try multiple common selectors
    const chatbotSelectors = [
      scenario.chatbotSelector,
      '[data-testid*="chatbot"]',
      '.chatbot',
      '[class*="chatbot"]',
      '[id*="chatbot"]',
      'button[class*="chat"]',
      '.chat-toggle',
      '.floating-chat'
    ];

    let chatbotFound = false;
    let usedSelector = '';

    for (const selector of chatbotSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        usedSelector = selector;
        chatbotFound = true;
        break;
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!chatbotFound) {
      // Take screenshot for debugging
      screenshot = await page.screenshot({ encoding: 'base64' });
      
      return {
        scenario: scenario.description,
        status: 'fail',
        message: 'Chatbot interface not found on page',
        screenshot: `data:image/png;base64,${screenshot}`,
        duration: Date.now() - startTime,
        errors: ['Chatbot UI element not detected']
      };
    }

    // Click to open chatbot if it's a toggle button
    try {
      await page.click(usedSelector);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      // Might already be open
    }

    // Look for input field
    const inputSelectors = [
      'input[placeholder*="message"]',
      'input[placeholder*="type"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="type"]',
      '.chat-input input',
      '.message-input',
      '[data-testid="chat-input"]'
    ];

    let inputFound = false;
    let inputSelector = '';

    for (const selector of inputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        inputSelector = selector;
        inputFound = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!inputFound) {
      screenshot = await page.screenshot({ encoding: 'base64' });
      
      return {
        scenario: scenario.description,
        status: 'fail',
        message: 'Chat input field not found',
        screenshot: `data:image/png;base64,${screenshot}`,
        duration: Date.now() - startTime,
        errors: ['Chat input field not detected']
      };
    }

    // Type test message
    await page.type(inputSelector, scenario.testMessage);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Look for send button and click it
    const sendSelectors = [
      'button[type="submit"]',
      'button[aria-label*="send"]',
      '.send-button',
      '[data-testid="send-button"]',
      'button:has-text("Send")',
      'button svg[class*="send"]'
    ];

    let sendClicked = false;
    for (const selector of sendSelectors) {
      try {
        await page.click(selector);
        sendClicked = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!sendClicked) {
      // Try pressing Enter as fallback
      await page.keyboard.press('Enter');
    }

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Look for chat messages
    const messageSelectors = [
      '.chat-message',
      '.message',
      '[data-testid*="message"]',
      '.bot-message',
      '.agent-message'
    ];

    let messagesFound = false;
    for (const selector of messageSelectors) {
      try {
        const messages = await page.$$(selector);
        if (messages.length > 0) {
          messagesFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    const duration = Date.now() - startTime;

    if (messagesFound) {
      return {
        scenario: scenario.description,
        status: 'pass',
        message: 'Chatbot interaction successful',
        duration
      };
    } else {
      screenshot = await page.screenshot({ encoding: 'base64' });
      
      return {
        scenario: scenario.description,
        status: 'warning',
        message: 'Chatbot interaction completed but response not clearly detected',
        screenshot: `data:image/png;base64,${screenshot}`,
        duration,
        errors: ['Could not verify chatbot response']
      };
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    
    try {
      if (browser) {
        const page = await browser.newPage();
        screenshot = await page.screenshot({ encoding: 'base64' });
      }
    } catch (screenshotError) {
      // Ignore screenshot errors
    }

    return {
      scenario: scenario.description,
      status: 'fail',
      message: 'UI test execution failed',
      screenshot: screenshot ? `data:image/png;base64,${screenshot}` : undefined,
      duration,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UITestResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      summary: { total: 0, passed: 0, failed: 1, warnings: 0 },
      results: [{
        scenario: 'HTTP Method Check',
        status: 'fail',
        message: `Method ${req.method} not allowed`,
        duration: 0
      }],
      timestamp: new Date().toISOString()
    });
  }

  logger.info('Starting UI chatbot tests', { 
    totalScenarios: UI_TEST_SCENARIOS.length 
  });

  const results: UITestResult[] = [];

  // Run tests sequentially to avoid browser resource conflicts
  for (const scenario of UI_TEST_SCENARIOS) {
    const result = await runUITest(scenario);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length
  };

  const success = summary.failed === 0;

  logger.info('UI chatbot tests completed', {
    summary,
    success
  });

  res.status(success ? 200 : 500).json({
    success,
    summary,
    results,
    timestamp: new Date().toISOString()
  });
}