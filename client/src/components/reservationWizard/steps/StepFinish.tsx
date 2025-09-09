// client/src/components/reservationWizard/steps/StepFinish.tsx

import React, { useRef, useState } from 'react';
import { Badge, Button, Spinner } from 'react-bootstrap';
import { CheckCircleFill, Download } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { Reservation, ShopSettings } from '../../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReservationSummary } from '../../reservationSummary/ReservationSummary';

interface StepFinishProps {
  reservation: Reservation | null;
  shopSettings: ShopSettings | null;
}

export const StepFinish: React.FC<StepFinishProps> = ({ reservation, shopSettings }) => {
  const navigate = useNavigate();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!reservation) {
    return (
      <div className="text-center">
        <p className="text-muted">Loading reservation details...</p>
      </div>
    );
  }


  const handleDownloadPdf = () => {
    const input = summaryRef.current;
    if (!input) return;

    setIsDownloading(true);

    html2canvas(input, { scale: 2 })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pdfWidth - 20;
        const canvasAspectRatio = canvas.width / canvas.height;
        const contentHeight = contentWidth / canvasAspectRatio;

        pdf.addImage(imgData, 'PNG', 10, 10, contentWidth, contentHeight);
        pdf.save(`reservation-invoice-${reservation?._id}.pdf`);
      })
      .catch(() => {
        alert('Could not generate PDF. Please try again.');
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };
  
  return (
    <div>
      {/* --- (1) RENDER THE DETAILED SUMMARY OFF-SCREEN FOR PDF CAPTURE --- */}
      <div style={{ position: 'fixed', left: '-2000px', top: 0, zIndex: -1 }}>
        <ReservationSummary ref={summaryRef} reservation={reservation} shopSettings={shopSettings} />
      </div>
      
      <div className="text-center p-3">
        <CheckCircleFill className="text-success mb-3" size={50} />
        <h3 className="mb-2">Reservation Request Submitted!</h3>
        <p className="text-muted mb-4">
            Your request has been processed. Our staff will review the details and contact you for confirmation.
        </p>
        <div className="d-inline-block p-3 border rounded mb-4">
          <p className="text-muted small mb-0" style={{ letterSpacing: '1px' }}>YOUR RESERVATION ID</p>
          <p className="h4 fw-bold text-danger mb-0">{reservation._id}</p>
        </div>
        <div className="text-start bg-light p-3 rounded small">
          <p className="mb-2">
              <Badge pill bg="primary" className="me-2">1</Badge> 
              Please check the status of your request using the <strong>Request Tracker</strong> page.
          </p>
          <p className="mb-0">
              <Badge pill bg="primary" className="me-2">2</Badge> 
              For any urgent concerns, feel free to <strong>contact us</strong> with your Reservation ID.
          </p>
        </div>
      </div>
    
      <div className="d-flex justify-content-center gap-2 mt-4">
          <Button variant="primary" onClick={() => navigate('/products')}>Browse More Outfits</Button>
          <Button variant="success" onClick={handleDownloadPdf} disabled={isDownloading}>
          {isDownloading ? (
              <Spinner as="span" size="sm" className="me-2" />
          ) : (
              <Download className="me-2"/>
          )}
          Download Invoice PDF
          </Button>
      </div>
    </div>
  );
};