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
import ProductCard from "../../components/product_card/ProductCard";
import CustomPagination from "../../components/customPagination/CustomPagination";

const products = Array(12).fill({
  image: Product_sample,
  title: "Single Breasted Jacket",
  price: 1200,
  sizes: "S,M,L,XL",
  liked: false,
});

function Products() {
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
      <div className="row">
        {/* Sidebar */}
        <div className="col-md-2 bg-white p-3 border-end text-start">
          <Form className="d-flex mb-4">
            <Form.Control
              type="text"
              placeholder="Search for dress color, type, or name"
              className="rounded-start-2 rounded-end-0"
            />
            <Button variant="primary" className="rounded-start-0 rounded-end-2">
              <Search size={20} color="white" />
            </Button>
          </Form>

          <div className="d-flex align-items-center mb-2">
            <Funnel className="me-2" />
            <strong>Search Filter</strong>
          </div>
          <hr />

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
        <div className="col-md-10 bg-light py-4 px-3">
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

          <Row xs={2} sm={3} md={4} className="g-3">
            {products.map((product, idx) => (
              <Col key={idx}>
                <ProductCard
                  image={product.image}
                  title={product.title}
                  price={product.price}
                  sizes={product.sizes}
                  liked={product.liked}
                />
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </div>
  );
}

export default Products;
