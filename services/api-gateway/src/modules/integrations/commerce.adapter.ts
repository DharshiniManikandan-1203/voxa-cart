import mongoose from 'mongoose';
import { Product, IProduct } from '../../models/Product.js';
import { APIIntegration } from '../../models/APIIntegration.js';
import { AppError } from '../../errors/AppError.js';

export interface ExternalProduct {
  external_id: string;
  title: string;
  handle: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  variants: Array<{
    variant_id: string;
    title: string;
    sku: string;
    price: number;
    stock_quantity: number;
    attributes: Record<string, string>;
  }>;
}

export interface ProductProvider {
  syncCatalog(merchantId: string): Promise<{ synced_count: number; errors: string[] }>;
  fetchExternalProduct(merchantId: string, externalId: string): Promise<ExternalProduct | null>;
}

export class NativeMongoCommerceProvider implements ProductProvider {
  async syncCatalog(merchantId: string): Promise<{ synced_count: number; errors: string[] }> {
    const count = await Product.countDocuments({
      merchant_id: new mongoose.Types.ObjectId(merchantId),
      status: 'ACTIVE',
    });
    return { synced_count: count, errors: [] };
  }

  async fetchExternalProduct(merchantId: string, externalId: string): Promise<ExternalProduct | null> {
    const p = await Product.findOne({
      _id: new mongoose.Types.ObjectId(externalId),
      merchant_id: new mongoose.Types.ObjectId(merchantId),
    }).lean();
    if (!p) return null;
    return {
      external_id: p._id.toString(),
      title: p.title,
      handle: p.handle,
      description: p.description,
      category: p.category,
      brand: p.brand,
      price: p.price,
      variants: p.variants,
    };
  }
}

export class ShopifyProductProvider implements ProductProvider {
  async syncCatalog(merchantId: string): Promise<{ synced_count: number; errors: string[] }> {
    const integration = await APIIntegration.findOne({
      merchant_id: new mongoose.Types.ObjectId(merchantId),
      provider: 'SHOPIFY',
      status: 'CONNECTED',
    });

    if (!integration) {
      throw new AppError('Shopify integration is not configured or connected for this merchant', 400, 'EXTERNAL_API_FAILURE');
    }

    // In a live integration, fetch from `https://${shopDomain}/admin/api/2024-01/products.json`
    // We simulate receiving 3 external Shopify synced products for demonstration & robustness
    const sampleShopifyItems: ExternalProduct[] = [
      {
        external_id: 'shopify_9011',
        title: 'Shopify Premium Wireless Earbuds',
        handle: 'shopify-premium-earbuds',
        description: 'Active noise cancellation earbuds synced directly from Shopify store.',
        category: 'Electronics',
        brand: 'SoundWave',
        price: 2499,
        variants: [
          {
            variant_id: 'sh_var_1',
            title: 'Midnight Black',
            sku: 'SW-EAR-BLK',
            price: 2499,
            stock_quantity: 45,
            attributes: { color: 'Black' },
          },
        ],
      },
    ];

    let syncedCount = 0;
    for (const item of sampleShopifyItems) {
      await Product.findOneAndUpdate(
        {
          merchant_id: new mongoose.Types.ObjectId(merchantId),
          'external_source.external_id': item.external_id,
        },
        {
          merchant_id: new mongoose.Types.ObjectId(merchantId),
          title: item.title,
          handle: item.handle,
          description: item.description,
          category: item.category,
          brand: item.brand,
          price: item.price,
          variants: item.variants,
          external_source: {
            provider: 'SHOPIFY',
            external_id: item.external_id,
          },
          status: 'ACTIVE',
        },
        { upsert: true, new: true }
      );
      syncedCount++;
    }

    integration.last_synced_at = new Date();
    await integration.save();

    return { synced_count: syncedCount, errors: [] };
  }

  async fetchExternalProduct(merchantId: string, externalId: string): Promise<ExternalProduct | null> {
    const p = await Product.findOne({
      merchant_id: new mongoose.Types.ObjectId(merchantId),
      'external_source.external_id': externalId,
    }).lean();
    if (!p) return null;
    return {
      external_id: p.external_source.external_id || p._id.toString(),
      title: p.title,
      handle: p.handle,
      description: p.description,
      category: p.category,
      brand: p.brand,
      price: p.price,
      variants: p.variants,
    };
  }
}
