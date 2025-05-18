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
  onClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  image,
  title,
  price,
  sizes,
  liked,
  onClick,
}) => {
  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <Card className="h-100 border-1 p-1 shadow-sm rounded-2">
        <div className="position-relative">
          <Card.Img variant="top" src={image} alt={title} />
          <div className="position-absolute top-0 end-0 p-2">
            <Heart color={liked ? "red" : "gray"} fill={liked ? "red" : "none"} />
          </div>
        </div>
        <Card.Body className="text-start p-2">
          <Card.Title as="h6" className="mb-1 text-truncate">
            {title}
          </Card.Title>
          <Card.Text className="mb-0 text-muted" style={{ fontSize: "0.85rem" }}>
            Size: {sizes}
          </Card.Text>
          <Card.Text className="fw-bold">₱{price}</Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ProductCard;
