// client/src/components/productCardSkeleton/ProductCardSkeleton.tsx

import React from 'react';
import { Card } from 'react-bootstrap';
import './productCardSkeleton.css'; // We will create this next

export const ProductCardSkeleton = () => {
  return (
    <Card className="product-card-skeleton h-100 shadow-sm rounded-2">
      {/* Image Placeholder */}
      <div className="skeleton skeleton-image"></div>
      
      <Card.Body className="text-start p-2">
        {/* Title Placeholder */}
        <div className="skeleton skeleton-title mb-2"></div>
        
        {/* Sizes/Text Placeholder */}
        <div className="skeleton skeleton-text mb-2"></div>
        
        {/* Price Placeholder */}
        <div className="skeleton skeleton-price"></div>
      </Card.Body>
    </Card>
  );
};