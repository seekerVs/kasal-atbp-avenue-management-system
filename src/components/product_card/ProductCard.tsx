// src/components/ProductCard.tsx
import React from "react";
import { Card } from "react-bootstrap";
import { Heart } from "react-bootstrap-icons";
import "./productCard.css";

interface ProductCardProps {
  image: string;
  title: string;
  price: number;
  sizes: string;
  liked: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  image,
  title,
  price,
  sizes,
  liked,
}) => {
  return (
    <Card className="h-100 border-0">
      <div className="position-relative">
        <Card.Img variant="top" src={image} alt={title} />
        <div className="position-absolute top-0 end-0 p-2">
          <Heart color={liked ? "red" : "gray"} fill={liked ? "red" : "none"} />
        </div>
      </div>
      <Card.Body className="text-center p-2">
        <Card.Title as="h6" className="mb-1 text-truncate">
          {title}
        </Card.Title>
        <Card.Text className="mb-0 text-muted" style={{ fontSize: "0.85rem" }}>
          Size: {sizes}
        </Card.Text>
        <Card.Text className="fw-bold mt-1">₱{price}</Card.Text>
      </Card.Body>
    </Card>
  );
};

export default ProductCard;
