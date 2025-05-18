import React from "react";
import { Card, ListGroup } from "react-bootstrap";
import "./packageCard.css";

interface PackageCardProps {
  title: string;
  price: number;
  note?: string;
  items: string[];
  selected?: boolean;
  onClick?: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  title,
  price,
  note,
  items,
  selected = false,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      className={`h-100 rounded-2 text-dark ${selected ? "custom-shadow" : "border-light"}`}
      style={{cursor: "pointer", borderWidth: "2px" }}
    >
      <Card.Header className="text-center fw-bold">{title}</Card.Header>

      <Card.Body className="text-start">
        <h4 className="fw-bold text-center">₱{price.toLocaleString()}</h4>
        {note && (
          <div
            className="text-muted fst-italic text-center mb-2"
            style={{ fontSize: "0.85rem" }}
          >
            {note}
          </div>
        )}

        <ListGroup variant="flush">
          {items.map((item, idx) => (
            <ListGroup.Item key={idx} className="border-0 p-0">
              • {item}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default PackageCard;
