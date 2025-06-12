import React, { useEffect, useState } from "react";
import { Alert, Button, Col, Row } from "react-bootstrap";
import PackageCard from "../../components/packageCard/PackageCard";
import CustomFooter from "../../components/customFooter/CustomFooter";
import { useNavigate } from "react-router-dom";

interface PackageItem {
  title: string;
  price: number;
  note?: string;
  items: string[];
}

const packages: PackageItem[] = [
  {
    title: "Package #1",
    price: 6888,
    note: "(in selected colors only)",
    items: [
      "Wedding Gown", "Groom (Barong, Tuxedo, B.tie)", "Best man (Barong, Tuxedo, B.tie)",
      "Maid of Honor", "Abay Girls (4 Cocktail Dress)", "Abay Boys (4 Barong/Chaleco only w/o pants)",
      "3 Flower Girls with Basket", "Ring Bearer (w/o pants)", "Bible Bearer (w/o pants)",
      "FREE Bride's Parents (SET) & FREE ARAS",
    ],
  },
  {
    title: "Package #2",
    price: 10888,
    items: [
      "Wedding Gown (RTW)", "Groom (Barong, Tuxedo, etc - RTW)", "Best man (Barong, Tuxedo, 1 set - RTW)",
      "Maid of Honor (RTW)", "Abay Girls (5)", "Abay Boys (5 Barong/Tuxedo - RTW)",
      "4 Flower Girls with Basket", "Ring Bearer (set - RTW)", "Bible Bearer (set - RTW)",
      "FREE Bride's & Groom's Parents (SET) & FREE ARAS",
    ],
  },
  {
    title: "Package #3",
    price: 15888,
    items: [
      "Wedding Gown (Tailored/Bride's own design)", "Groom (Barong, Tuxedo, etc - RTW)",
      "Best man (Barong, Tuxedo, etc - RTW)", "Maid of Honor", "Abay Girls (5 - RTW)",
      "Abay Boys (5 w/pants, long sleeve, B.tie - RTW)", "4 Flower Girls with Basket (RTW)",
      "Ring Bearer (w/pants, long sleeve, B.tie - RTW)", "Bible Bearer (w/pants, long sleeve, B.tie - RTW)",
      "FREE Bride's & Groom's Parents (SET-RTW) & FREE ARAS",
    ],
  },
];

function Package() {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Auto-dismiss alert after 3 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  const handleNextClick = () => {
    // console.log("handleNextClick called. selectedIndex:", selectedIndex); // Debugging log

    if (selectedIndex === null) {
      // If no package is selected, show an alert and STOP navigation
      setShowAlert(true);
      return; // IMPORTANT: This stops the function from proceeding to navigate
    }

    // Get the selected package data
    const selectedPackageData = packages[selectedIndex];
    // console.log("Navigating with selected package:", selectedPackageData); // Debugging log

    // Navigate to PackageViewer, passing the selected package data in the state
    navigate(`/packageViewer`, { state: { packageData: selectedPackageData } });
  };

  return (
    <div className="container-fluid pt-3 pt-lg-4 px-4 justify-content-center">
      <div className="w-100 d-flex justify-content-between px-0 px-lg-5">
        <h3 className="display-7">Select a package offer </h3>
        <Button
          variant="primary"
          size="sm"
          className="px-3"
          onClick={handleNextClick}
        >
          Next
        </Button>
      </div>
      {showAlert && (
        <Alert
          variant="warning"
          onClose={() => setShowAlert(false)}
          dismissible
          className="position-fixed top-0 start-50 translate-middle-x mt-3 shadow"
          style={{ zIndex: 1050, width: "100%", maxWidth: "500px" }}
        >
          Please select a package to continue. {/* Clear and concise message */}
        </Alert>
      )}
      <div className="w-100 d-flex align-items-start justify-content-center gap-3">
        <Row className="g-4 m-0">
          {packages.map((pkg, idx) => (
            <Col key={idx} md={4} style={{ width: "400px", maxWidth: "400px" }}>
              <div
                className="h-100"
                // Ensure setSelectedIndex is correctly updating the state
                onClick={() => {
                    setSelectedIndex(idx);
                    // console.log("PackageCard clicked. New selectedIndex:", idx); // Debugging log
                }}
                style={{ cursor: "pointer" }}
              >
                <PackageCard
                  title={pkg.title}
                  price={pkg.price}
                  note={pkg.note}
                  items={pkg.items}
                  selected={idx === selectedIndex}
                />
              </div>
            </Col>
          ))}
        </Row>
      </div>
      <footer className="text-dark py-3">
        <CustomFooter />
      </footer>
    </div>
  );
}

export default Package;

