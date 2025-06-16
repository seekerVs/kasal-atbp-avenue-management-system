import React, { useState } from "react";
import {
  Button,
  Col,
  Dropdown,
  Form,
  Row,
  DropdownButton,
  ButtonGroup,
  Accordion,
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

type FilterFormProps = {
  selectedAge: string;
  setSelectedAge: React.Dispatch<React.SetStateAction<string>>;
  selectedGender: string;
  setSelectedGender: React.Dispatch<React.SetStateAction<string>>;
  attireType: string;
  setAttireType: React.Dispatch<React.SetStateAction<string>>;
};

const FilterForm: React.FC<FilterFormProps> = ({
  selectedAge,
  setSelectedAge,
  selectedGender,
  setSelectedGender,
  attireType,
  setAttireType,
}) => (
  <>
    <Form className="mw-100 d-flex mb-4" style={{ minWidth: "200px" }}>
      <Form.Control
        type="text"
        placeholder="Search"
        className="rounded-start-2 rounded-end-0"
      />
      <Button
        variant="primary"
        className="rounded-start-0 rounded-end-2"
      >
        <Search size={20} color="white" />
      </Button>
    </Form>

    <div className="d-none d-lg-flex mt-3">
      <Funnel size={24} className="me-2" />
      <h5 className="fw-semibold">Filters</h5>
    </div>
    <hr />

    <strong>Age group</strong>
    <Form>
      <Form.Check
        type="radio"
        name="ageGroup"
        label="Adult"
        id="adult"
        checked={selectedAge === "Adult"}
        onChange={() => setSelectedAge("Adult")}
      />
      <Form.Check
        type="radio"
        name="ageGroup"
        label="Kids"
        id="kids"
        checked={selectedAge === "Kids"}
        onChange={() => setSelectedAge("Kids")}
      />
    </Form>
    <hr />

    <strong>Gender</strong>
    <Form>
      <Form.Check
        type="radio"
        name="gender"
        label="Male"
        id="male"
        checked={selectedGender === "Male"}
        onChange={() => setSelectedGender("Male")}
      />
      <Form.Check
        type="radio"
        name="gender"
        label="Female"
        id="female"
        checked={selectedGender === "Female"}
        onChange={() => setSelectedGender("Female")}
      />
    </Form>
    <hr />

    <strong>Attire Type</strong>
    <Form>
      {[
        "Casual Wear",
        "Formal Wear",
        "Wedding Attire",
        "Business Wear",
        "Traditional Attire",
        "Themed Costume",
      ].map((item, i) => (
        <Form.Check
          key={i}
          type="radio"
          name="attireType"
          id={`attire-${i}`}
          label={item}
          value={item}
          checked={attireType === item}
          onChange={(e) => setAttireType(e.currentTarget.value)}
        />
      ))}
    </Form>
  </>
);

function Products() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("Relevance");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [attireType, setAttireType] = useState("");
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
    <div className="container-fluid px-4 pt-4">
      <div className="row px-0 px-lg-5">
        {/* Sidebar */}
        <Col md={3} className="px-2 pt-0 border-end text-start">
          {/* Mobile View Accordion */}
          <div className="d-md-none mb-3">
            <Accordion>
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <Funnel className="me-2" />
                  <strong>Filters</strong>
                </Accordion.Header>
                <Accordion.Body>
                  <FilterForm
                    selectedAge={selectedAge}
                    setSelectedAge={setSelectedAge}
                    selectedGender={selectedGender}
                    setSelectedGender={setSelectedGender}
                    attireType={attireType}
                    setAttireType={setAttireType}
                  />
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </div>

          {/* Desktop View Filter */}
          <div className="d-none d-md-block">
            <FilterForm
              selectedAge={selectedAge}
              setSelectedAge={setSelectedAge}
              selectedGender={selectedGender}
              setSelectedGender={setSelectedGender}
              attireType={attireType}
              setAttireType={setAttireType}
            />
          </div>
        </Col>

        {/* Product Grid */}
        <div className="col-md-9 pb-4 px-3">
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
      </div>
      <footer className="px-0 px-lg-5 text-dark py-3">
        <CustomFooter />
      </footer>
    </div>
  );
}

export default Products;
