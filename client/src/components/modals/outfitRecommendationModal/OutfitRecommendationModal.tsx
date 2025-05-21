import React from "react";
import {
  Modal,
  Button,
  Row,
  Col,
  Form,
  Spinner,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { QuestionCircle } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";

interface OutfitRecommendationModalProps {
  show: boolean;
  onHide: () => void;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onRecommend: () => void;
  loading?: boolean;
}

const measurements = [
  "Full Shoulder",
  "Waist",
  "Bicep",
  "Hip",
  "Full Chest",
  "Thigh",
];

const OutfitRecommendationModal: React.FC<OutfitRecommendationModalProps> = ({
  show,
  onHide,
  values,
  onChange,
  onRecommend,
  loading = true,
}) => {
  const renderTooltip = (props: any) => (
    <Tooltip id="help-tooltip" {...props}>
      These measurements help us recommend your perfect fit.
    </Tooltip>
  );

  const navigate = useNavigate();

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-semibold">Outfit Recommendation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-4">
          Find the best outfit in an instant
          <OverlayTrigger placement="top" overlay={renderTooltip}>
            <QuestionCircle size={16} className="ms-2" />
          </OverlayTrigger>
        </p>

        <Form>
          <Row>
            {measurements.map((label, idx) => (
              <Col md={6} className="mb-3" key={label}>
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type="text"
                  value={values[label] || ""}
                  onChange={(e) => onChange(label, e.target.value)}
                />
              </Col>
            ))}
          </Row>
        </Form>

        {loading && (
          <div className="d-flex align-items-center text-muted mt-2">
            <Spinner
              animation="border"
              size="sm"
              className="me-2 text-danger"
            />
            Retrieving data input from device…
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="danger" onClick={() => navigate(`/products`)}>
          Recommend
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OutfitRecommendationModal;
