// client/src/components/packageCard/PackageCard.tsx

import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { Check2 } from 'react-bootstrap-icons';
import './packageCard.css'; // We'll create this next
import { InclusionItem } from '../../types';

interface PackageCardProps {
  title: string;
  price: number;
  note?: string;
  items: InclusionItem[];
  imageUrls?: string[];
  isFeatured?: boolean; // New prop for the badge
}

const PackageCard: React.FC<PackageCardProps> = ({ title, price, note, items, imageUrls, isFeatured }) => {
  return (
    <Card className="h-100 package-card shadow-sm">
      {isFeatured && <Badge bg="danger" className="featured-badge">Best Value</Badge>}
      
      {imageUrls && imageUrls.length > 0 && <Card.Img variant="top" src={imageUrls[0]} className="package-card-img" />}
      
      <Card.Header className="text-center package-card-header">
        <h5 className="mb-0">{title}</h5>
      </Card.Header>
      
      <Card.Body className="d-flex flex-column">
        <div className="text-center mb-3">
          <span className="package-price">₱{price.toLocaleString()}</span>
          {note && <p className="text-muted small mt-1 mb-0">{note}</p>}
        </div>
        
        <ListGroup variant="flush" className="flex-grow-1">
          {items.slice(0, 9).map((inclusion) => (
            <ListGroup.Item key={inclusion._id} className="d-flex border-0 p-1 lh-sm">
              <Check2 className="text-success me-2 flex-shrink-0 mt-1" />
              <span>{`${inclusion.wearerNum} ${inclusion.name}`}</span>
            </ListGroup.Item>
          ))}
          {items.length > 7 && (
            <ListGroup.Item className="d-flex border-0 px-0 text-muted">
                ...and more
            </ListGroup.Item>
          )}
        </ListGroup>
      </Card.Body>
      <Card.Footer className="text-center text-primary fw-bold package-card-footer">
          Click to View Details
      </Card.Footer>
    </Card>
  );
};

export default PackageCard;