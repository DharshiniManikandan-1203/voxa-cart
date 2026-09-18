export interface PricingItemInput {
  product_id: string;
  variant_id: string;
  title: string;
  sku: string;
  quantity: number;
  unit_price: number;
  category?: string;
}

export interface DiscountRuleInput {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  min_order_value?: number;
  max_discount_cap?: number;
  applicable_categories?: string[];
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  starts_at?: Date;
  expires_at?: Date;
}

export interface PricingCalculationResult {
  items: Array<PricingItemInput & { total_price: number }>;
  subtotal: number;
  discount_total: number;
  coupon_applied?: {
    code: string;
    type: string;
    discount_amount: number;
    description: string;
  };
  tax_rate_percent: number;
  tax_amount: number;
  shipping_fee: number;
  is_free_shipping: boolean;
  grand_total: number;
  currency: string;
  calculation_timestamp: string;
}

export class DeterministicPricingEngine {
  /**
   * Deterministically calculates line totals, discounts, taxes, shipping, and grand total.
   */
  public static calculate(
    items: PricingItemInput[],
    discountRule?: DiscountRuleInput | null,
    options: {
      currency?: string;
      taxRatePercent?: number;
      freeShippingThreshold?: number;
      standardShippingFee?: number;
    } = {}
  ): PricingCalculationResult {
    const currency = options.currency || 'INR';
    const taxRatePercent = options.taxRatePercent !== undefined ? options.taxRatePercent : 5; // 5% standard GST
    const freeShippingThreshold = options.freeShippingThreshold !== undefined ? options.freeShippingThreshold : 999;
    const standardShippingFee = options.standardShippingFee !== undefined ? options.standardShippingFee : 50;

    // 1. Calculate Line Item Totals and Gross Subtotal
    let subtotal = 0;
    const calculatedItems = items.map((item) => {
      const qty = Math.max(1, Math.floor(item.quantity || 1));
      const unitPrice = Math.max(0, Math.round(item.unit_price * 100) / 100);
      const lineTotal = Math.round(unitPrice * qty * 100) / 100;
      subtotal += lineTotal;
      return {
        ...item,
        quantity: qty,
        unit_price: unitPrice,
        total_price: lineTotal,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    // 2. Evaluate Dynamic Discounts
    let discountTotal = 0;
    let couponApplied: PricingCalculationResult['coupon_applied'] = undefined;
    let freeShippingCoupon = false;

    if (discountRule && discountRule.status === 'ACTIVE') {
      const now = new Date();
      const isStarted = !discountRule.starts_at || new Date(discountRule.starts_at) <= now;
      const isNotExpired = !discountRule.expires_at || new Date(discountRule.expires_at) >= now;

      if (isStarted && isNotExpired) {
        const minOrder = discountRule.min_order_value || 0;

        if (subtotal >= minOrder) {
          // Determine eligible subtotal based on applicable categories
          let eligibleSubtotal = subtotal;
          if (discountRule.applicable_categories && discountRule.applicable_categories.length > 0) {
            const allowedCats = new Set(discountRule.applicable_categories.map((c) => c.toLowerCase()));
            eligibleSubtotal = calculatedItems.reduce((acc, it) => {
              if (it.category && allowedCats.has(it.category.toLowerCase())) {
                return acc + it.total_price;
              }
              return acc;
            }, 0);
          }

          if (eligibleSubtotal > 0) {
            if (discountRule.type === 'PERCENTAGE') {
              let calculatedDiscount = (eligibleSubtotal * discountRule.value) / 100;
              if (discountRule.max_discount_cap && discountRule.max_discount_cap > 0) {
                calculatedDiscount = Math.min(calculatedDiscount, discountRule.max_discount_cap);
              }
              discountTotal = Math.min(calculatedDiscount, subtotal);
              couponApplied = {
                code: discountRule.code,
                type: 'PERCENTAGE',
                discount_amount: Math.round(discountTotal * 100) / 100,
                description: `${discountRule.value}% off applied`,
              };
            } else if (discountRule.type === 'FIXED_AMOUNT') {
              discountTotal = Math.min(discountRule.value, eligibleSubtotal);
              couponApplied = {
                code: discountRule.code,
                type: 'FIXED_AMOUNT',
                discount_amount: Math.round(discountTotal * 100) / 100,
                description: `Flat ${currency} ${discountRule.value} discount applied`,
              };
            } else if (discountRule.type === 'FREE_SHIPPING') {
              freeShippingCoupon = true;
              couponApplied = {
                code: discountRule.code,
                type: 'FREE_SHIPPING',
                discount_amount: 0,
                description: 'Free standard shipping applied',
              };
            }
          }
        }
      }
    }

    discountTotal = Math.round(discountTotal * 100) / 100;
    const discountedBase = Math.max(0, subtotal - discountTotal);

    // 3. Calculate Taxes on Net Taxable Base
    const taxAmount = Math.round(((discountedBase * taxRatePercent) / 100) * 100) / 100;

    // 4. Calculate Shipping Fee
    const qualifiesForFreeShipping = subtotal >= freeShippingThreshold || freeShippingCoupon;
    const shippingFee = (items.length > 0 && !qualifiesForFreeShipping) ? standardShippingFee : 0;

    // 5. Calculate Final Payable Amount
    const grandTotal = Math.round((discountedBase + taxAmount + shippingFee) * 100) / 100;

    return {
      items: calculatedItems,
      subtotal,
      discount_total: discountTotal,
      coupon_applied: couponApplied,
      tax_rate_percent: taxRatePercent,
      tax_amount: taxAmount,
      shipping_fee: shippingFee,
      is_free_shipping: qualifiesForFreeShipping,
      grand_total: grandTotal,
      currency,
      calculation_timestamp: new Date().toISOString(),
    };
  }
}
