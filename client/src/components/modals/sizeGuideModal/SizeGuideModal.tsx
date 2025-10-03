// client/src/components/modals/sizeGuideModal/SizeGuideModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Image, Form, InputGroup, Table, Badge } from 'react-bootstrap';
import { HowToMeasure } from '../../../assets/images';
import { sizeChart, sizeOrder } from '../../../data/sizeChartData';
import './sizeGuideModal.css';

interface SizeGuideModalProps {
  show: boolean;
  onHide: () => void;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ show, onHide }) => {

  return (
    <Modal show={show} onHide={onHide} size="lg" centered> {/* Changed size to "lg" for a better fit */}
      <Modal.Header closeButton>
        <Modal.Title>Size Guide</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        <Row className="g-2">
          {/* --- LEFT COLUMN: HOW TO MEASURE --- */}
          <Col md={4}>
            <h5 className="mb-4">How to Measure your Body?</h5>
            <div className="text-center mb-4">
              <Image src={HowToMeasure} fluid alt="Diagram showing how to measure bust, waist, and hips" className="measure-diagram" />
            </div>
            <div className="lh-sm small">
                <div className="d-flex align-items-start">
                    <Badge pill bg="dark" className="me-3 fs-6">1</Badge>
                    <div>
                    <strong>Your Bust (Chest)</strong>
                    <p className="text-muted mb-0">Measure the circumference over the fullest part of your bust.</p>
                    </div>
                </div>
                <div className="d-flex align-items-start">
                    <Badge pill bg="dark" className="me-3 fs-6">2</Badge>
                    <div>
                    <strong>Your Waist</strong>
                    <p className="text-muted mb-0">Measure your waist at the thinnest place.</p>
                    </div>
                </div>
                <div className="d-flex align-items-start">
                    <Badge pill bg="dark" className="me-3 fs-6">3</Badge>
                    <div>
                    <strong>Your Hips</strong>
                    <p className="text-muted mb-0">Measure the fullest part of your hips.</p>
                    </div>
                </div>
            </div>
          </Col>

          {/* --- RIGHT COLUMN: SIZE CHART TABLE --- */}
          <Col md={8}>
            <Table bordered hover responsive className="size-guide-table">
              <thead className="table-light">
                <tr>
                  <th>Size</th>
                  <th>Height (cm)</th>
                  <th>Chest (cm)</th>
                  <th>Waist (cm)</th>
                  <th>Hips (cm)</th>
                </tr>
              </thead>
              <tbody>
                {sizeOrder.map(sizeKey => {
                  const sizeData = sizeChart[sizeKey];
                  return (
                    <tr key={sizeKey}>
                      <td>{sizeKey}</td>
                      <td>{sizeData.Height}</td>
                      <td>{`${sizeData.Chest.min}-${sizeData.Chest.max}`}</td>
                      <td>{`${sizeData.Waist.min}-${sizeData.Waist.max}`}</td>
                      <td>{`${sizeData.Hips.min}-${sizeData.Hips.max}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <p className="small text-muted fst-italic mt-2">*Depending on your body type and dressing habits, the above sizes are for reference only.</p>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};