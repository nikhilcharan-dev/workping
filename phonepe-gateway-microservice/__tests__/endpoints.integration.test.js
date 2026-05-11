/**
 * ============================================================================
 * PhonePe Gateway Microservice — Integration Tests
 * ============================================================================
 *
 * Tests cover end-to-end payment flows:
 *   • Health probe (liveness check)
 *   • Payment initiation (amount validation vs allowlist)
 *   • Payment status polling
 *   • Refund initiation and status
 *   • PhonePe webhook with authentication + idempotency + state machine
 *   • Browser callback handler with fallback forwarding
 *   • Error handling (invalid inputs, auth failures, PhonePe API errors)
 *   • Rate limiting enforcement
 *
 * Setup:
 *   jest.unstable_mockModule() mocks:
 *     • axios (PhonePe API client)
 *     • redis (in-memory for idempotency + state tracking)
 *     • phonepe.auth (token generation)
 *   Environment variables gated with NODE_ENV !== "test"
 */

import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import request from 'supertest';

// Mock Redis before importing app
jest.unstable_mockModule('../config/redis.js', () => {
  const mockRedis = {
    set: jest.fn(async (key, value, options) => {
      if (options?.NX) {
        if (mockRedis._store[key]) return null;
        mockRedis._store[key] = value;
        return value;
      }
      mockRedis._store[key] = value;
      return value;
    }),
    get: jest.fn(async (key) => mockRedis._store[key] || null),
    del: jest.fn(async (key) => {
      delete mockRedis._store[key];
      return 1;
    }),
    connect: jest.fn(),
    on: jest.fn(),
    _store: {},
  };
  return { default: mockRedis };
});

// Mock axios
jest.unstable_mockModule('axios', () => ({
  default: jest.fn(),
}));

// Mock phonepe.auth
jest.unstable_mockModule('../config/phonepe.auth.js', () => ({
  default: jest.fn(async () => 'mock_auth_token_12345'),
}));

import app from '../service.js';
import axios from 'axios';
import redis from '../config/redis.js';
import getAuthorisationToken from '../config/phonepe.auth.js';

describe('PhonePe Gateway Microservice — Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis._store = {};
    process.env.VALID_PLAN_AMOUNTS_PAISE = '99900,199900,299900'; // ₹999, ₹1999, ₹2999
    process.env.WEBHOOK_USERNAME = 'webhook_user';
    process.env.WEBHOOK_PASSWORD = 'webhook_pass';
    process.env.PHONEPE_WEBHOOK_SECRET = 'webhook_secret_key_12345';
    process.env.ORIGIN_WEBHOOK_URL = 'https://api.workping.live/webhooks/payment';
    process.env.ORIGIN_WEBHOOK_SECRET = 'origin_webhook_secret';
  });

  describe('Health Check', () => {
    test('should return 200 OK with UP status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'UP',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Payment Initiation', () => {
    test('should initiate payment with valid amount in allowlist', async () => {
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            instrumentResponseCode: 'SUCCESS',
            redirectUrl: 'https://checkout.phonepe.com/checkout/abc123',
          },
        },
      });

      const response = await request(app).post('/api/payments/initiate-payment').send({
        amount: 999, // ₹999 = 99900 paise
        orderId: 'order_12345',
        userId: 'emp_001',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(axios).toHaveBeenCalledWith(
        expect.stringContaining('/checkout/v2/pay'),
        expect.objectContaining({
          merchantOrderId: 'order_12345',
          amount: 99900,
        }),
        expect.any(Object)
      );
    });

    test('should reject payment with amount not in allowlist', async () => {
      const response = await request(app).post('/api/payments/initiate-payment').send({
        amount: 500, // ₹500 = 50000 paise (NOT in allowlist)
        orderId: 'order_12346',
        userId: 'emp_001',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('does not match any active plan price');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should reject payment with invalid amount', async () => {
      const response = await request(app).post('/api/payments/initiate-payment').send({
        amount: -100,
        orderId: 'order_12347',
        userId: 'emp_001',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid amount');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should reject payment with missing orderId', async () => {
      const response = await request(app).post('/api/payments/initiate-payment').send({
        amount: 999,
        userId: 'emp_001',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid orderId');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should reject payment with missing userId', async () => {
      const response = await request(app).post('/api/payments/initiate-payment').send({
        amount: 999,
        orderId: 'order_12348',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing userId');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should handle PhonePe API errors gracefully', async () => {
      axios.mockRejectedValueOnce({
        response: {
          status: 503,
          data: { error: 'Service Unavailable' },
        },
      });

      const response = await request(app).post('/api/payments/initiate-payment').send({
        amount: 999,
        orderId: 'order_12349',
        userId: 'emp_001',
      });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Payment Status Check', () => {
    test('should fetch payment status from PhonePe', async () => {
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          code: 'PAYMENT_SUCCESS',
          data: {
            merchantOrderId: 'order_12345',
            transactionId: 'T12345',
            state: 'COMPLETED',
            amount: 99900,
          },
        },
      });

      const response = await request(app).post('/api/payments/get-payment-status').send({
        orderId: 'order_12345',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(axios).toHaveBeenCalledWith(
        expect.stringContaining('/checkout/v2/order/order_12345/status'),
        expect.any(Object)
      );
    });

    test('should reject status check without orderId', async () => {
      const response = await request(app).post('/api/payments/get-payment-status').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing orderId');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should handle PhonePe API error on status check', async () => {
      axios.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'Order not found' },
        },
      });

      const response = await request(app).post('/api/payments/get-payment-status').send({
        orderId: 'invalid_order',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Refund Initiation', () => {
    test('should initiate refund with valid parameters', async () => {
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          refundId: 'refund_001',
          status: 'INITIATED',
        },
      });

      const response = await request(app).post('/api/refund/initiate-refund').send({
        refundId: 'refund_001',
        orderId: 'order_12345',
        amount: 999,
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(axios).toHaveBeenCalledWith(
        expect.stringContaining('/payments/v2/refund'),
        expect.objectContaining({
          merchantRefundId: 'refund_001',
          originalMerchantOrderId: 'order_12345',
          amount: 99900,
        }),
        expect.any(Object)
      );
    });

    test('should reject refund with missing refundId', async () => {
      const response = await request(app).post('/api/refund/initiate-refund').send({
        orderId: 'order_12345',
        amount: 999,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should reject refund with missing orderId', async () => {
      const response = await request(app).post('/api/refund/initiate-refund').send({
        refundId: 'refund_001',
        amount: 999,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should reject refund with missing amount', async () => {
      const response = await request(app).post('/api/refund/initiate-refund').send({
        refundId: 'refund_001',
        orderId: 'order_12345',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
      expect(axios).not.toHaveBeenCalled();
    });

    test('should handle PhonePe refund API error', async () => {
      axios.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Invalid refund amount' },
        },
      });

      const response = await request(app).post('/api/refund/initiate-refund').send({
        refundId: 'refund_002',
        orderId: 'order_12345',
        amount: 5000, // Refund amount > original
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Refund Status Check', () => {
    test('should fetch refund status', async () => {
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          refundId: 'refund_001',
          status: 'COMPLETED',
          amount: 99900,
        },
      });

      const response = await request(app).post('/api/refund/get-refund-status').send({
        refundId: 'refund_001',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(axios).toHaveBeenCalledWith(
        expect.stringContaining('/payments/v2/refund/refund_001/status'),
        expect.any(Object)
      );
    });

    test('should reject refund status check without refundId', async () => {
      const response = await request(app).post('/api/refund/get-refund-status').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing refundId');
      expect(axios).not.toHaveBeenCalled();
    });
  });

  describe('PhonePe Webhook Authentication & State Machine', () => {
    const generateBasicAuth = (username, password) => {
      return Buffer.from(`${username}:${password}`).toString('base64');
    };

    const generateHMAC = (payload, secret) => {
      return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    };

    test('should reject webhook without basic auth', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12345',
          state: 'COMPLETED',
          amount: 99900,
        },
      };

      const response = await request(app).post('/api/phonepe/webhook').send(payload);

      expect(response.status).toBe(401);
      expect(response.text).toBe('Unauthorized');
    });

    test('should reject webhook with invalid basic auth', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12345',
          state: 'COMPLETED',
          amount: 99900,
        },
      };

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('wrong_user', 'wrong_pass'))
        .send(payload);

      expect(response.status).toBe(401);
    });

    test('should reject webhook without X-Verify signature', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12345',
          state: 'COMPLETED',
          amount: 99900,
        },
      };

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .send(payload);

      expect(response.status).toBe(401);
    });

    test('should reject webhook with invalid X-Verify signature', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12345',
          state: 'COMPLETED',
          amount: 99900,
        },
      };

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', 'invalid_signature###')
        .send(payload);

      expect(response.status).toBe(401);
    });

    test('should accept webhook with valid auth and signature', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12345',
          state: 'COMPLETED',
          amount: 99900,
          metaInfo: { udf1: 'emp_001' },
          paymentDetails: { transactionId: 'T12345' },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = generateHMAC(rawBody, 'webhook_secret_key_12345');

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', `${signature}###`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle idempotent webhook deliveries (deduplicate)', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12346',
          state: 'COMPLETED',
          amount: 99900,
          metaInfo: { udf1: 'emp_001' },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = generateHMAC(rawBody, 'webhook_secret_key_12345');

      // First delivery
      const response1 = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', `${signature}###`)
        .send(payload);

      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);

      // Duplicate delivery (same order + state)
      const response2 = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', `${signature}###`)
        .send(payload);

      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(true);
      expect(response2.body.note).toBe('duplicate');
    });

    test('should enforce state machine: PENDING -> COMPLETED', async () => {
      const completedPayload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12347',
          state: 'COMPLETED',
          amount: 99900,
          metaInfo: { udf1: 'emp_001' },
        },
      };

      const rawBody = JSON.stringify(completedPayload);
      const signature = generateHMAC(rawBody, 'webhook_secret_key_12345');

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', `${signature}###`)
        .send(completedPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify order state was recorded
      expect(redis.set).toHaveBeenCalledWith('order:state:order_12347', 'COMPLETED', expect.any(Object));
    });

    test('should enforce state machine: PENDING -> FAILED', async () => {
      const failedPayload = {
        event: 'PAYMENT_FAILED',
        payload: {
          merchantOrderId: 'order_12348',
          state: 'FAILED',
          amount: 99900,
          metaInfo: { udf1: 'emp_001' },
        },
      };

      const rawBody = JSON.stringify(failedPayload);
      const signature = generateHMAC(rawBody, 'webhook_secret_key_12345');

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', `${signature}###`)
        .send(failedPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid state transition (COMPLETED -> FAILED)', async () => {
      // Set initial state to COMPLETED
      redis._store['order:state:order_12349'] = 'COMPLETED';

      const invalidPayload = {
        event: 'PAYMENT_FAILED',
        payload: {
          merchantOrderId: 'order_12349',
          state: 'FAILED',
          amount: 99900,
          metaInfo: { udf1: 'emp_001' },
        },
      };

      const rawBody = JSON.stringify(invalidPayload);
      const signature = generateHMAC(rawBody, 'webhook_secret_key_12345');

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', `${signature}###`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid state transition');
    });

    test('should reject webhook with missing merchantOrderId', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          state: 'COMPLETED',
          amount: 99900,
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = generateHMAC(rawBody, 'webhook_secret_key_12345');

      const response = await request(app)
        .post('/api/phonepe/webhook')
        .set('Authorization', 'Basic ' + generateBasicAuth('webhook_user', 'webhook_pass'))
        .set('X-Verify', `${signature}###`)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid payload');
    });
  });

  describe('Payment Callback Handler', () => {
    test('should handle USER_CANCEL callback', async () => {
      const response = await request(app).post('/api/payments/phonepe/callback').send({
        orderId: 'order_12345',
        callbackResponse: 'USER_CANCEL',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('CANCELLED');
    });

    test('should verify status and forward to origin webhook on CONCLUDED', async () => {
      axios.mockResolvedValueOnce({
        data: {
          state: 'COMPLETED',
          amount: 99900,
          paymentDetails: { transactionId: 'T12345' },
          metaInfo: { udf1: 'emp_001' },
        },
      });

      const response = await request(app).post('/api/payments/phonepe/callback').send({
        orderId: 'order_12345',
        callbackResponse: 'CONCLUDED',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.state).toBe('COMPLETED');

      // Verify PhonePe status API was called
      expect(axios).toHaveBeenCalledWith(
        expect.stringContaining('/checkout/v2/order/order_12345/status'),
        expect.any(Object)
      );
    });

    test('should forward payment status to origin webhook (fire-and-log)', async () => {
      axios
        .mockResolvedValueOnce({
          data: {
            state: 'COMPLETED',
            amount: 99900,
            paymentDetails: { transactionId: 'T12345' },
            metaInfo: { udf1: 'emp_001' },
          },
        })
        .mockResolvedValueOnce({ data: { ok: true } }); // webhook forward response

      const response = await request(app).post('/api/payments/phonepe/callback').send({
        orderId: 'order_12350',
        callbackResponse: 'CONCLUDED',
      });

      expect(response.status).toBe(200);

      // Verify both axios calls happened (status check + webhook forward)
      expect(axios).toHaveBeenCalledTimes(2);
    });

    test('should reject callback with invalid callbackResponse', async () => {
      const response = await request(app).post('/api/payments/phonepe/callback').send({
        orderId: 'order_12345',
        callbackResponse: 'INVALID_RESPONSE',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid callbackResponse');
    });

    test('should reject callback without orderId', async () => {
      const response = await request(app).post('/api/payments/phonepe/callback').send({
        callbackResponse: 'CONCLUDED',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should reject callback without callbackResponse', async () => {
      const response = await request(app).post('/api/payments/phonepe/callback').send({
        orderId: 'order_12345',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should handle PhonePe API error on callback verification', async () => {
      axios.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { error: 'Order not found' },
        },
      });

      const response = await request(app).post('/api/payments/phonepe/callback').send({
        orderId: 'invalid_order',
        callbackResponse: 'CONCLUDED',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should return 400 for malformed JSON', async () => {
      const response = await request(app)
        .post('/api/payments/initiate-payment')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
    });

    test('should handle missing Authorization header in webhook', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          merchantOrderId: 'order_12345',
          state: 'COMPLETED',
        },
      };

      const response = await request(app).post('/api/phonepe/webhook').send(payload);

      expect(response.status).toBe(401);
    });

    test('should handle CORS preflight for payment endpoints', async () => {
      const response = await request(app)
        .options('/api/payments/initiate-payment')
        .set('Origin', process.env.ORIGIN);

      expect(response.status).toBe(204);
    });

    test('should reject requests from disallowed CORS origins', async () => {
      const response = await request(app)
        .post('/api/payments/initiate-payment')
        .set('Origin', 'https://malicious.com')
        .send({
          amount: 999,
          orderId: 'order_12345',
          userId: 'emp_001',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Payment Flow Integration', () => {
    test('should complete full payment flow: initiate -> status check', async () => {
      // 1. Initiate payment
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            instrumentResponseCode: 'SUCCESS',
            redirectUrl: 'https://checkout.phonepe.com/abc123',
          },
        },
      });

      const initiateResponse = await request(app).post('/api/payments/initiate-payment').send({
        amount: 1999,
        orderId: 'flow_test_001',
        userId: 'emp_002',
      });

      expect(initiateResponse.status).toBe(200);
      expect(initiateResponse.body.success).toBe(true);

      // 2. Check payment status
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            merchantOrderId: 'flow_test_001',
            state: 'COMPLETED',
            amount: 199900,
          },
        },
      });

      const statusResponse = await request(app).post('/api/payments/get-payment-status').send({
        orderId: 'flow_test_001',
      });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);
    });

    test('should complete full refund flow: initiate -> status check', async () => {
      // 1. Initiate refund
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          refundId: 'refund_flow_001',
          status: 'INITIATED',
        },
      });

      const refundResponse = await request(app).post('/api/refund/initiate-refund').send({
        refundId: 'refund_flow_001',
        orderId: 'flow_test_001',
        amount: 1999,
      });

      expect(refundResponse.status).toBe(200);
      expect(refundResponse.body.status).toBe('success');

      // 2. Check refund status
      axios.mockResolvedValueOnce({
        data: {
          success: true,
          refundId: 'refund_flow_001',
          status: 'COMPLETED',
        },
      });

      const statusResponse = await request(app).post('/api/refund/get-refund-status').send({
        refundId: 'refund_flow_001',
      });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);
    });
  });
});
