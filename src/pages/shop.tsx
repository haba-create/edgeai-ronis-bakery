import { useState } from 'react';
import { GetServerSideProps } from 'next';
import CustomerPortal from '@/components/customer/CustomerPortal';
import { Product } from '@/models/types';
import { getDb } from '@/utils/db';

interface ProductWithSupplier extends Product {
  supplier_name?: string;
}

interface ShopPageProps {
  products: ProductWithSupplier[];
  categories: string[];
}

export default function ShopPage({ products, categories }: ShopPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerPortal products={products} categories={categories} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const db = await getDb();
  
  try {
    // Fetch all active products
    const products = await db.all(`
      SELECT p.*, s.name as supplier_name, s.id as supplier_id
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.current_stock > 0
      ORDER BY p.category, p.name
    `);
    
    // Get unique categories
    const categoriesResult = await db.all(`
      SELECT DISTINCT category FROM products 
      WHERE current_stock > 0 
      ORDER BY category
    `);
    
    const categories = categoriesResult.map(row => row.category);
    
    return {
      props: {
        products,
        categories
      }
    };
  } catch (error) {
    console.error('Error fetching shop data:', error);
    return {
      props: {
        products: [],
        categories: []
      }
    };
  }
};