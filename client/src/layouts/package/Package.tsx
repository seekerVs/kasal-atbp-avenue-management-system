// client/src/layouts/package/Package.tsx

import { useEffect, useState } from "react";
import { Alert, Col, Row, Spinner, Form } from "react-bootstrap";
import { CalendarEvent } from "react-bootstrap-icons";
import DatePicker from "react-datepicker";

import api from '../../services/api';
import { Package as PackageType } from '../../types';

import './package.css';
import { useAlert } from "../../contexts/AlertContext";
import { useNavigate } from "react-router-dom";
import PackageCard from "../../components/packageCard/PackageCard";

function Package() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/packages');
        setPackages(response.data);
      } catch (err) {
        setError("Failed to load packages. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  return (
    <>
      <div className="package-page-container pt-3 pt-lg-4">
        <div className="w-100 text-center mb-4">
          <h2 className="display-6">Select a Package Offer</h2>
          <p className="text-muted">Choose one of our curated packages for a complete and hassle-free experience.</p>
        </div>

        <Row className="justify-content-center mb-4">
          <Col md={6} lg={4}>
            <Form.Group>
              <Form.Label className="fw-bold d-flex align-items-center justify-content-center">
                <CalendarEvent className="me-2"/>
                Select Your Target Event Date
              </Form.Label>
              <DatePicker
                selected={targetDate}
                onChange={(date) => setTargetDate(date)}
                minDate={new Date()}
                className="form-control text-center"
                placeholderText="Click to select a date..."
                isClearable
                dateFormat="MMMM d, yyyy"
                wrapperClassName="w-100"
              />
            </Form.Group>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /><p className="mt-2">Loading Packages...</p></div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <Row xs={1} md={2} xl={3} className="g-4 justify-content-center">
            {packages.map((pkg, index) => (
              <Col key={pkg._id}>
                <div
                  className="package-card-wrapper"
                  onClick={() => {
                    if (!targetDate) {
                      addAlert('Please select your target event date first.', 'info');
                      return;
                    }
                    navigate('/packageViewer', { state: { packageData: pkg, targetDate: targetDate } });
                  }}
                >
                  <PackageCard
                    title={pkg.name}
                    price={pkg.price}
                    note={pkg.description}
                    items={pkg.inclusions}
                    imageUrls={pkg.imageUrls} // <-- This is the fix
                    isFeatured={index === 1}
                  />
                </div>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </>
  );
}

export default Package;