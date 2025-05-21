import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Button,
  Image,
  OverlayTrigger,
  Tooltip,
  Spinner,
  Carousel,
  Modal,
} from "react-bootstrap";
import { X } from "react-bootstrap-icons";
import {
  Product1,
  Product2,
  Product3,
  Product4,
  SizeChart,
} from "../../assets/images";
import { useParams } from "react-router-dom";
import CustomFooter from "../../components/customFooter/CustomFooter";

interface Product {
  id: number;
  images: string[];
  title: string;
  price: number;
  sizes: string;
  liked: boolean;
  category?: string;
  description?: string;
  features?: string[];
  composition?: string;
  availableColors: string[];
}

interface ColorInfo {
  name: string;
  hex: string;
  requestedHex: string;
  distance: number;
  population: number;
}

const ProductViewer: React.FC = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("");
  const [colorMap, setColorMap] = useState<Record<string, ColorInfo>>({});
  const [loadingColors, setLoadingColors] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      const mockProduct: Product = {
        id: 1,
        images: [Product1, Product2, Product3, Product4],
        title: "Relaxed Fit Khaki Green Cargo Joggers",
        price: 499,
        sizes: "S,M,L,XL",
        liked: false,
        category: "Casual Wear",
        description:
          "Handmade crafted by indigenous atisans. Previously worn by famous artists.",
        features: [
          "Contrast Stitch",
          "2 Flap Pockets",
          "2 Box Pockets",
          "2 Back Pocket",
          "2 Front Pockets",
          "Straight Fit",
          "Made in U.S.A",
        ],
        composition: "100% Cotton. Machine wash inside out.",
        availableColors: ["#78866B", "#FFFF00", "#FFFFFF"],
      };
      setProduct(mockProduct);
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product?.availableColors?.length) return;

    const fetchColors = async () => {
      setLoadingColors(true);
      const query = product.availableColors
        .map((hex) => hex.replace("#", ""))
        .join(",");
      try {
        const response = await fetch(
          `https://api.color.pizza/v1/?values=${query}&list=bestOf`
        );
        const data = await response.json();
        const map: Record<string, ColorInfo> = {};
        data.colors.forEach((color: ColorInfo) => {
          const originalHex = `#${color.requestedHex
            .replace("#", "")
            .toUpperCase()}`;
          map[originalHex] = color;
        });
        setColorMap(map);
      } catch (error) {
        console.error("Failed to fetch color data:", error);
      } finally {
        setLoadingColors(false);
      }
    };

    fetchColors();
  }, [product?.availableColors]);

  if (!product) return <p>Loading...</p>;
  if (product.id !== parseInt(id || "0")) {
    return <p>Product not found</p>;
  }

  const sizes = product.sizes.split(",");
  const colors = product.availableColors || [];

  return (
    <div className="position-relative mx-5 mt-3 mt-lg-4">
      <Button
        variant="link"
        className="position-absolute top-0 end-0 m-0 p-2 pe-0"
        onClick={() => window.history.back()}
      >
        <X size={28} color="dark" />
      </Button>
      <Row>
        <Col md={5}>
          <div
            className="d-inline-block oveflow-hidden shadow-sm"
            style={{ maxWidth: "60%" }}
          >
            <Carousel
              interval={1000}
              prevIcon={
                <span
                  aria-hidden="true"
                  className="carousel-control-prev-icon"
                  style={{ filter: "invert(1)" }}
                />
              }
              nextIcon={
                <span
                  aria-hidden="true"
                  className="carousel-control-next-icon"
                  style={{ filter: "invert(1)" }}
                />
              }
            >
              {product.images?.map((img, id) => (
                <Carousel.Item key={id}>
                  <Image
                    src={img}
                    fluid
                    style={{ maxHeight: "600px", objectFit: "cover" }}
                  />
                </Carousel.Item>
              ))}
            </Carousel>
          </div>
        </Col>

        <Col md={7} className="text-start text-dark">
          <small className="text-uppercase text-muted">
            {product.category}
          </small>
          <h3 className="mt-2 mb-0 semibold">{product.title}</h3>
          <p>{product.description}</p>

          <h4 className="fw-semibold">₱ {product.price}</h4>

          <div className="d-flex flex-row gap-5 mt-3">
            <div className="mb-3">
              <strong>Select Size</strong>
              <div className="d-flex gap-2 mt-2">
                {sizes.map((s) => (
                  <Button
                    key={s}
                    variant={s === size ? "primary" : "outline-primary"}
                    size="sm"
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <a
                href="#sizechart"
                className="d-block mt-1 text-decoration-underline"
                style={{ fontSize: "0.9rem" }}
                onClick={() => setShowSizeChart(true)}
              >
                Size Chart
              </a>
            </div>

            <div className="mb-3">
              <strong>Select Quantity</strong>
              <div className="d-flex align-items-center gap-2 mt-2">
                <Button
                  variant="outline-primary"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  -
                </Button>
                <span>{quantity}</span>
                <Button
                  variant="outline-primary"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </Button>
                <small className="ms-2 text-muted">12 pieces available</small>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <strong>Color Variation</strong>
            <div className="d-flex gap-2 mt-2">
              {loadingColors ? (
                <Spinner animation="border" size="sm" />
              ) : (
                colors.map((c) => {
                  const info = colorMap[c.toUpperCase()];
                  const hex = info?.hex || c;
                  const tooltip = info ? `${info.name}` : `Unknown (${c})`;

                  return (
                    <OverlayTrigger
                      key={c}
                      placement="top"
                      overlay={<Tooltip id={`tooltip-${c}`}>{c}</Tooltip>}
                    >
                      <Button
                        size="sm"
                        onClick={() => setColor(c)}
                        variant={color === c ? "primary" : "outline-primary"}
                        className="d-flex align-items-center gap-2"
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            backgroundColor: hex,
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                        />
                        {tooltip}
                      </Button>
                    </OverlayTrigger>
                  );
                })
              )}
            </div>
          </div>

          <div className="d-flex flex-wrap gap-3 my-3">
            <Button variant="secondary" size="lg" className="flex-fill">
              Add to cart
            </Button>
            <Button size="lg" className="flex-fill">
              Order now
            </Button>
          </div>

          <div className="mt-4">
            <h5>Features</h5>
            <ul>
              {(product.features || []).map((feat, idx) => (
                <li key={idx}>{feat}</li>
              ))}
            </ul>

            <h5>Composition</h5>
            <p>{product.composition}</p>
          </div>
        </Col>
      </Row>
      <footer className="text-dark pb-3">
        <CustomFooter />
      </footer>

      <Modal
        show={showSizeChart}
        onHide={() => setShowSizeChart(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Size Chart</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Image src={SizeChart} fluid />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ProductViewer;
