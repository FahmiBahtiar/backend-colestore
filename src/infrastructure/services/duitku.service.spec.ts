/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DuitkuService } from './duitku.service';
import * as crypto from 'crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('DuitkuService', () => {
  let service: DuitkuService;
  let configService: ConfigService;

  const mockConfig = {
    merchantCode: 'D1234',
    merchantKey: 'abcde12345abcde12345abcde1234567',
    callbackUrl: 'http://localhost:3001/payments/duitku/webhook',
    returnUrl: 'http://localhost:3000/orders',
    environment: 'sandbox',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuitkuService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockConfig),
          },
        },
      ],
    }).compile();

    service = module.get<DuitkuService>(DuitkuService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapChannel', () => {
    it('should map bank codes to Duitku generic codes', () => {
      expect((service as any).mapChannel('VIRTUAL_ACCOUNT', 'BCA')).toBe('BC');
      expect((service as any).mapChannel('VIRTUAL_ACCOUNT', 'BNI')).toBe('I1');
      expect((service as any).mapChannel('VIRTUAL_ACCOUNT', 'BRI')).toBe('BR');
      expect((service as any).mapChannel('VIRTUAL_ACCOUNT', 'MANDIRI')).toBe(
        'M2',
      );
      expect((service as any).mapChannel('VIRTUAL_ACCOUNT', 'PERMATA')).toBe(
        'A1',
      );
    });

    it('should map ewallet codes to Duitku codes', () => {
      expect((service as any).mapChannel('EWALLET', 'OVO')).toBe('OV');
      expect((service as any).mapChannel('EWALLET', 'DANA')).toBe('DA');
      expect((service as any).mapChannel('EWALLET', 'SHOPEEPAY')).toBe('SA');
      expect((service as any).mapChannel('EWALLET', 'LINKAJA')).toBe('LA');
    });

    it('should pass through QRIS code directly to Duitku', () => {
      expect((service as any).mapChannel('QR_CODE', 'GQ')).toBe('GQ');
    });
  });

  describe('signature calculation', () => {
    it('should correctly compute HMAC-SHA256 signature for Inquiry', () => {
      const orderId = 'order-123';
      const amount = 150000;
      const stringToSign = `${mockConfig.merchantCode}${orderId}${amount}`;
      const expectedHash = crypto
        .createHmac('sha256', mockConfig.merchantKey)
        .update(stringToSign)
        .digest('hex');

      const computed = (service as any).computeSignature(orderId, amount);
      expect(computed).toBe(expectedHash);
    });
  });

  describe('parseWebhook', () => {
    it('should parse and verify valid signature webhook callbacks', async () => {
      const orderId = 'order-999';
      const amount = 250000;
      const reference = 'DUITKUREF123';

      // HMAC-SHA256(merchantCode + amount + merchantOrderId, merchantKey)
      const stringToSign = `${mockConfig.merchantCode}${amount}${orderId}`;
      const validSignature = crypto
        .createHmac('sha256', mockConfig.merchantKey)
        .update(stringToSign)
        .digest('hex');

      const payload = {
        merchantCode: mockConfig.merchantCode,
        amount: amount,
        merchantOrderId: orderId,
        paymentCode: 'BC',
        resultCode: '00',
        reference: reference,
        signature: validSignature,
      };

      const result = await service.parseWebhook(payload);

      expect(result).toEqual({
        invoiceId: reference,
        paymentRequestId: reference,
        status: 'PAID',
        paymentProof: reference,
        amount: amount,
      });
    });

    it('should throw UnauthorizedException on signature mismatch', async () => {
      const payload = {
        merchantCode: mockConfig.merchantCode,
        amount: 250000,
        merchantOrderId: 'order-999',
        paymentCode: 'BC',
        resultCode: '00',
        reference: 'DUITKUREF123',
        signature: 'invalid_signature_hash',
      };

      await expect(service.parseWebhook(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException on missing parameters', async () => {
      const payload = {
        merchantCode: mockConfig.merchantCode,
        amount: 250000,
      };

      await expect(service.parseWebhook(payload)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
