// client/src/components/modals/motifBuilderModal/MotifBuilderModal.tsx

import  { useState, useMemo } from 'react';
import { Modal, Row, Col, Card, Form, InputGroup } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';
import { InventoryItem } from '../../../types';
import './motifBuilderModal.css';

interface ColorInfo {
  name: string;
  hex: string;
}

interface ColorCoverage {
  color: ColorInfo;
  itemCount: number; // The number of distinct items available in this color
}

interface MotifBuilderModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (color: ColorInfo) => void;
  inventory: InventoryItem[];
}

export function MotifBuilderModal({ show, onHide, onSelect, inventory }: MotifBuilderModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // useMemo is crucial here for performance. This complex calculation will only run
  // when the inventory changes, not on every render.
  const colorCoverageData = useMemo((): ColorCoverage[] => {
    if (!inventory || inventory.length === 0) return [];

    // Step 1: Get a map of all unique colors (hex -> name) from the inventory.
    const uniqueColors = new Map<string, string>();
    inventory.forEach(item => {
      item.variations.forEach(v => {
        if (!uniqueColors.has(v.color.hex)) {
          uniqueColors.set(v.color.hex, v.color.name);
        }
      });
    });

    // Step 2: For each unique color, count how many inventory items have it.
    const coverage: ColorCoverage[] = [];
    uniqueColors.forEach((name, hex) => {
      // Filter the entire inventory to find items that have at least one variation with this hex color.
      const itemCount = inventory.filter(item => 
        item.variations.some(v => v.color.hex === hex)
      ).length; // The .length of the resulting array is our count.

      coverage.push({
        color: { name, hex },
        itemCount: itemCount,
      });
    });

    // Sort by the number of items, so the most versatile colors appear first.
    return coverage.sort((a, b) => b.itemCount - a.itemCount);
  }, [inventory]);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return colorCoverageData;
    }
    const lowercasedSearch = searchTerm.toLowerCase();
    return colorCoverageData.filter(c => 
      c.color.name.toLowerCase().includes(lowercasedSearch)
    );
  }, [colorCoverageData, searchTerm]);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Select Motif from Inventory</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Row className="mb-3">
          <Col>
            <InputGroup>
              <InputGroup.Text><Search /></InputGroup.Text>
              <Form.Control 
                placeholder="Search for a color name..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
        </Row>
        <div className="motif-grid-container">
          {filteredData.map(({ color, itemCount }) => (
            <Card 
              key={color.hex} 
              className="motif-card" 
              onClick={() => {
                onSelect(color);
                onHide(); // Close the modal after selection
              }}
            >
              <div className="motif-card-swatch" style={{ backgroundColor: color.hex }} />
              <Card.Body className="p-2">
                <Card.Title as="h6" className="mb-1 text-truncate">{color.name}</Card.Title>
                <Card.Text className="text-muted small">
                  Available in {itemCount} item types
                </Card.Text>
              </Card.Body>
            </Card>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
}