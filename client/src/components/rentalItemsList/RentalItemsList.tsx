import React from 'react';
import { Row, Col, Image, Button, ButtonGroup, Badge } from 'react-bootstrap';
import { BoxSeam, PencilSquare, Trash } from 'react-bootstrap-icons';
import { SingleRentItem, RentedPackage, CustomTailoringItem } from '../../types';

// --- COMPONENT PROPS INTERFACE ---
interface RentalItemsListProps {
  singleRents: SingleRentItem[];
  packageRents: RentedPackage[];
  customTailoring: CustomTailoringItem[];
  canEditDetails: boolean;
  onOpenEditItemModal: (item: SingleRentItem) => void;
  onOpenDeleteItemModal: (item: SingleRentItem) => void;
  onOpenEditPackageModal: (pkg: RentedPackage) => void;
  onOpenDeletePackageModal: (pkg: RentedPackage) => void;
  onOpenEditCustomItemModal: (item: CustomTailoringItem) => void;
  onOpenDeleteCustomItemModal: (item: CustomTailoringItem) => void;
}

// ===================================================================================
// --- THE REUSABLE COMPONENT ---
// ===================================================================================
const RentalItemsList: React.FC<RentalItemsListProps> = ({
  singleRents,
  packageRents,
  customTailoring,
  canEditDetails,
  onOpenEditItemModal,
  onOpenDeleteItemModal,
  onOpenEditPackageModal,
  onOpenDeletePackageModal,
  onOpenEditCustomItemModal,
  onOpenDeleteCustomItemModal,
}) => {

  const SingleItem = ({ item }: { item: SingleRentItem }) => {
    return (
      <Row className="align-items-center mb-3 border-bottom pb-3">
        <Col xs="auto">
          <Image src={item.imageUrl} thumbnail style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
        </Col>
        <Col>
          <p className="fw-medium mb-1">{item.name}</p>
          <p className="text-muted small mb-0">Variation: {item.variation.color.name} - {item.variation.size}</p>
          <p className="text-muted small mb-0">Qty: {item.quantity}</p>
        </Col>
        <Col xs="auto" className="text-end">
          <p className="fw-semibold h5 text-success mb-2">₱{(item.price * item.quantity).toFixed(2)}</p>
          {canEditDetails && (
            <>
              <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => onOpenEditItemModal(item)}><PencilSquare /></Button>
              <Button variant="outline-danger" size="sm" onClick={() => onOpenDeleteItemModal(item)}><Trash /></Button>
            </>
          )}
        </Col>
      </Row>
    );
  };

  const PackageItem = ({ pkg }: { pkg: RentedPackage }) => (
    <Row className="align-items-center mb-3 border-bottom pb-3">
      <Col xs="auto">
        <Image src={pkg.imageUrl} thumbnail style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
      </Col>
      <Col>
        <p className="fw-medium mb-1">{pkg.name.split(',')[0]}</p>
        <p className="text-muted small mb-0">Motif: {pkg.name.split(',')[1] || 'N/A'}</p>
      </Col>
      <Col xs="auto" className="text-end">
        <p className="fw-semibold h5 text-success mb-2">₱{(pkg.price).toFixed(2)}</p>
        {canEditDetails && (
          <>
            <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => onOpenEditPackageModal(pkg)}>
              <PencilSquare />
            </Button>
            <Button variant="outline-danger" size="sm" onClick={() => onOpenDeletePackageModal(pkg)}>
              <Trash />
            </Button>
          </>
        )}
      </Col>
    </Row>
  );

  const CustomItem = ({ item }: { item: CustomTailoringItem }) => {
    // A placeholder image can be one of the reference images or a default
    const displayImage = item.referenceImages && item.referenceImages.length > 0 
        ? item.referenceImages[0] 
        : 'https://placehold.co/80x80/6c757d/white?text=Custom';

    const hasMeasurements = item.measurements && Object.keys(item.measurements).length > 0;
    const statusText = hasMeasurements ? "Fitted" : "Pending Fit";
        
    return (
        <Row className="align-items-center mb-3 border-bottom pb-3">
            <Col xs="auto">
                <Image src={displayImage} thumbnail style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
            </Col>
            <Col>
                <p className="mb-1 fw-medium">{item.name}</p>
                <p className="text-muted small mb-0">Qty: {item.quantity}</p>
                {/* You can add more details here if needed, like status or type */}
                <Badge bg="info" pill className="mt-1">{statusText}</Badge>
            </Col>
            <Col xs="auto" className="text-end">
                <p className="fw-semibold h5 text-success mb-2">₱{(item.price * item.quantity).toFixed(2)}</p>
                {canEditDetails && (
                    <>
                      <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => onOpenEditCustomItemModal(item)}><PencilSquare /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => onOpenDeleteCustomItemModal(item)}><Trash /></Button>
                    </>
                )}
            </Col>
        </Row>
    );
  };

  return (
    <>
      {singleRents?.length > 0 && (
        <>
          <hr />
          <h5 className="mb-3"><BoxSeam className="me-2" />Single Rented Items</h5>
          {singleRents.map((item, index) => <SingleItem key={`single-${index}`} item={item} />)}
        </>
      )}
      {packageRents?.length > 0 && (
        <>
          <hr />
          <h5 className="mb-3"><BoxSeam className="me-2" />Package Rentals</h5>
          {packageRents.map((pkg, index) => <PackageItem key={`pkg-${index}`} pkg={pkg} />)}
        </>
      )}
      {customTailoring?.length > 0 && (
        <>
          <hr />
          <h5 className="mb-3"><PencilSquare className="me-2" />Custom Tailoring</h5>
          {customTailoring.map((item, index) => <CustomItem key={`custom-${index}`} item={item} />)}
        </>
      )}
    </>
  );
};

export default RentalItemsList;