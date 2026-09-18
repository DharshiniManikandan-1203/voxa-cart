import test from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicPricingEngine, PricingItemInput, DiscountRuleInput } from '../src/modules/commerce/pricing.engine.js';

test('DeterministicPricingEngine - computes standard subtotal without discounts', () => {
  const items: PricingItemInput[] = [
    { product_id: 'p1', variant_id: 'v1', title: 'Running Shoes', sku: 'SH-1', quantity: 2, unit_price: 1500 },
    { product_id: 'p2', variant_id: 'v2', title: 'Socks', sku: 'SK-1', quantity: 1, unit_price: 250 },
  ];

  const result = DeterministicPricingEngine.calculate(items, null, {
    taxRatePercent: 5,
    freeShippingThreshold: 5000,
    standardShippingFee: 50,
  });

  // subtotal = (1500 * 2) + (250 * 1) = 3250
  assert.equal(result.subtotal, 3250);
  assert.equal(result.discount_total, 0);
  // tax = 5% of 3250 = 162.5
  assert.equal(result.tax_amount, 162.5);
  // shipping = 50 (subtotal < 5000)
  assert.equal(result.shipping_fee, 50);
  // grand total = 3250 + 162.5 + 50 = 3462.5
  assert.equal(result.grand_total, 3462.5);
});

test('DeterministicPricingEngine - applies percentage discount with max cap', () => {
  const items: PricingItemInput[] = [
    { product_id: 'p1', variant_id: 'v1', title: 'Nike Shoes', sku: 'NK-1', quantity: 1, unit_price: 3000 },
  ];

  const discount: DiscountRuleInput = {
    code: 'VOXA20',
    type: 'PERCENTAGE',
    value: 20, // 20% of 3000 = 600
    max_discount_cap: 400, // Capped at 400
    min_order_value: 1000,
    status: 'ACTIVE',
  };

  const result = DeterministicPricingEngine.calculate(items, discount, {
    taxRatePercent: 0,
    freeShippingThreshold: 999,
  });

  assert.equal(result.subtotal, 3000);
  assert.equal(result.discount_total, 400); // Capped at 400 instead of 600
  assert.equal(result.shipping_fee, 0); // Qualifies for free shipping
  assert.equal(result.grand_total, 2600);
  assert.equal(result.coupon_applied?.code, 'VOXA20');
});

test('DeterministicPricingEngine - rejects coupon when min_order_value is not met', () => {
  const items: PricingItemInput[] = [
    { product_id: 'p1', variant_id: 'v1', title: 'Wristband', sku: 'WB-1', quantity: 1, unit_price: 300 },
  ];

  const discount: DiscountRuleInput = {
    code: 'BIGDEAL',
    type: 'FIXED_AMOUNT',
    value: 100,
    min_order_value: 1000,
    status: 'ACTIVE',
  };

  const result = DeterministicPricingEngine.calculate(items, discount);

  assert.equal(result.subtotal, 300);
  assert.equal(result.discount_total, 0); // Rejected
  assert.equal(result.coupon_applied, undefined);
});
