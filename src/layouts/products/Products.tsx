import React, { useState } from "react";
import {
  Button,
  Col,
  Dropdown,
  Form,
  Row,
  DropdownButton,
  ButtonGroup,
} from "react-bootstrap";
import { Funnel, Search } from "react-bootstrap-icons";
import { Product_sample } from "../../assets/images";
import ProductCard from "../../components/productCard/ProductCard";
import CustomPagination from "../../components/customPagination/CustomPagination";
import { useNavigate } from "react-router-dom";
import CustomFooter from "../../components/customFooter/CustomFooter";

const products = Array(12)
  .fill(null)
  .map((_, index) => ({
    id: index + 1,
    image: Product_sample,
    title: "Single Breasted Jacket",
    price: 1200,
    sizes: "S,M,L,XL",
    liked: false,
  }));

function Products() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("Relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelect = (eventKey: string | null) => {
    if (eventKey === "1") setSelected("Relevance");
    else if (eventKey === "2") setSelected("Latest");
    else if (eventKey === "3") setSelected("Price: Low to High");
    else if (eventKey === "4") setSelected("Price: High to Low");
  };

  return (
    <div className="container-fluid px-4">
      <div className="row px-0 px-lg-5 bg-white">
        {/* Sidebar */}
        <div className=" col-md-3 bg-white p-3 pt-4 ps-0 border-end text-start">
          <Form className="mw-100 d-flex mb-4" style={{ minWidth: "250px" }}>
            <Form.Control
              type="text"
              size="sm"
              placeholder="Search"
              className="rounded-start-2 rounded-end-0"
            />
            <Button
              variant="primary"
              size="sm"
              className="rounded-start-0 rounded-end-2"
            >
              <Search size={20} color="white" />
            </Button>
          </Form>

          <div className="d-flex align-items-center mb-0">
            <Funnel className="me-2" />
            <strong>Search Filter</strong>
          </div>
          <hr className="mt-2" />

          <strong>Age group</strong>
          <Form.Check type="checkbox" label="Adult" />
          <Form.Check type="checkbox" label="Kids" />
          <hr />

          <strong>Gender</strong>
          <Form.Check type="checkbox" label="Male" />
          <Form.Check type="checkbox" label="Female" />
          <hr />

          <strong>Attire type</strong>
          {[
            "Casual Wear",
            "Formal Wear",
            "Wedding Attire",
            "Business Wear",
            "Traditional Attire",
            "Themed Costume",
          ].map((item, i) => (
            <Form.Check key={i} label={item} />
          ))}
          <hr />

          <strong>Garment type</strong>
          {[
            "Dresses and Gowns",
            "Suits and Tuxedos",
            "Jumpsuits and Pantsuits",
            "Skirts and Blouses",
            "Blazers and Jackets",
          ].map((item, i) => (
            <Form.Check key={i} label={item} />
          ))}
        </div>

        {/* Product Grid */}
        <div className="col-md-9 py-4 px-3">
          <div className="d-flex justify-content-end align-items-center">
            <DropdownButton
              as={ButtonGroup}
              size="sm"
              align="end"
              variant="outline-secondary"
              title={selected}
              onSelect={handleSelect}
              className="pt-0 pb-3"
            >
              <Dropdown.Item eventKey="1">Relevance</Dropdown.Item>
              <Dropdown.Item eventKey="2">Latest</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item eventKey="3">Price: Low to High</Dropdown.Item>
              <Dropdown.Item eventKey="4">Price: High to Low</Dropdown.Item>
            </DropdownButton>

            <CustomPagination
              active={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>

          <Row xs={2} sm={3} xxl={5} className="g-3">
            {products.map((product) => (
              <Col key={product.id} className="d-flex justify-content-center">
                <div style={{ maxWidth: "200px", width: "100%" }}>
                  <ProductCard
                    image={product.image}
                    title={product.title}
                    price={product.price}
                    sizes={product.sizes}
                    liked={product.liked}
                    onClick={() => navigate(`/productViewer/${product.id}`)}
                  />
                </div>
              </Col>
            ))}
          </Row>
        </div>
        <footer className="bg-white text-dark py-3">
          <CustomFooter />
        </footer>
      </div>
    </div>
  );
}

export default Products;
