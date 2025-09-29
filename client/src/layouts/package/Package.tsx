// client/src/layouts/package/Package.tsx

import React, { useEffect, useState } from "react";
import { Alert, Col, Row, Spinner, Container } from "react-bootstrap";
import PackageCard from "../../components/packageCard/PackageCard";
import { useNavigate } from "react-router-dom";

import api from '../../services/api';
import { Package as PackageType } from '../../types';

import './package.css';

function Package() {
  const navigate = useNavigate();

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
                  onClick={() => navigate(`/packageViewer`, { state: { packageData: pkg } })}
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