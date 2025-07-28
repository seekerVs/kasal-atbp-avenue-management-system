// client/src/components/ProductCard.tsx

import React from "react";
import { Card } from "react-bootstrap";
import { Heart, HeartFill } from "react-bootstrap-icons"; // Import HeartFill
import "./productCard.css";

interface ProductCardProps {
  image: string;
  title: string;
  price: number;
  sizes: string[];
  heartCount: number; // ADDED
  isHearted: boolean; // ADDED
  onHeartClick: () => void; // ADDED
  onCardClick: () => void; // RENAMED for clarity
}

const ProductCard: React.FC<ProductCardProps> = ({
  image,
  title,
  price,
  sizes,
  heartCount,
  isHearted,
  onHeartClick,
  onCardClick,
}) => {
  const availableSizes = sizes.join(", ");

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card's onCardClick from firing
    onHeartClick();
  };

  return (
    <Card onClick={onCardClick} className="product-card h-100 shadow-sm rounded-2">
      <div className="product-card-image-wrapper">
        <Card.Img variant="top" src={image} alt={title} className="product-card-img" />
        <div className={`product-card-overlay ${isHearted ? 'is-hearted' : ''}`}>
          {/* This is now a clickable button */}
          <button onClick={handleHeartClick} className="heart-button">
            {isHearted ? (
              <HeartFill color="red" size={16} />
            ) : (
              <Heart color="white" size={16} />
            )}
          </button>
        </div>
      </div>
      <Card.Body className="text-start p-2">
        <Card.Title as="h6" className="mb-1 text-truncate fw-bold">
          {title}
        </Card.Title>
        <div className="d-flex justify-content-between align-items-center">
          <Card.Text className="mb-1 text-muted" style={{ fontSize: "0.85rem" }}>
            Sizes: {availableSizes || 'N/A'}
          </Card.Text>
          {/* Display the heart count */}
          <div className="d-flex align-items-center text-muted" style={{ fontSize: "0.8rem" }}>
            <HeartFill className="me-1" />
            <span>{heartCount}</span>
          </div>
        </div>
        <Card.Text className="fw-bold text-danger">₱{price.toLocaleString()}</Card.Text>
      </Card.Body>
    </Card>
  );
};

export default ProductCard;