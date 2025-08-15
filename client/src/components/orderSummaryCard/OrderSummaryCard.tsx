// client/src/components/orderSummaryCard/OrderSummaryCard.tsx

import React from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { formatCurrency } from '../../utils/formatters';

interface SummaryItem {
  label: string;
  value: number;
  isBold?: boolean;
  isMuted?: boolean; // <-- ADD THIS LINE
}

interface OrderSummaryCardProps {
  title: string;
  items: SummaryItem[];
  totalLabel: string;
  totalValue: number;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  title,
  items,
  totalLabel,
  totalValue,
}) => {
  return (
    <Card className="shadow-sm sticky-top" style={{ top: '90px' }}>
      <Card.Header as="h5">{title}</Card.Header>
      <Card.Body>
        <ListGroup variant="flush">
          {items.map((item, index) => (
            <ListGroup.Item
              key={index}
              className={`d-flex justify-content-between px-0 ${item.isBold ? 'fw-bold' : ''} ${item.isMuted ? 'text-muted small' : ''}`}
            >
              <span>{item.label}</span>
              <span>{formatCurrency(item.value)}</span>
            </ListGroup.Item>
          ))}
          <ListGroup.Item
            variant="success"
            className="d-flex justify-content-between mt-2 rounded"
          >
            <strong className="h5 mb-0">{totalLabel}</strong>
            <strong className="h5 mb-0">₱{formatCurrency(totalValue)}</strong>
          </ListGroup.Item>
        </ListGroup>
      </Card.Body>
    </Card>
  );
};