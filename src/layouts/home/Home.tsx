import React from 'react';
import { Container, Image, Button, Form } from 'react-bootstrap';
import store_1 from '../../assets/images/store_1.jpg';
import { Stars } from 'react-bootstrap-icons';
import './home.css';

function Home() {
  return (
    <Container fluid className="d-flex flex-column p-0">
      <div className="store1-style position-relative overflow-hidden">
        <Image
          src={store_1}
          alt="Store image"
          className="w-100 object-fit-cover"
        />

        <div className="w-auto h-auto position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center">
          <div className="bg-black bg-opacity-25 p-3 rounded-1 text-center">
            <h2 className="fw-bold text-white">Find your perfect outfit</h2>
            <Form className="search-style d-flex gap-3">
              <Form.Group controlId="formBasicEmail" className="mb-0 flex-grow-1">
                <Form.Control
                  type="text"
                  placeholder="Look for dress color, type, or name"
                  size="lg"
                />
              </Form.Group>
              <Button variant="primary" size="lg" type="submit">
                Search
              </Button>
            </Form>
          </div>

          {/* Button spacing */}
          <div className="w-auto h-auto d-flex align-items-center mt-4 rounded-1 overflow-hidden border-black"> 
            <Button
              className=" bg-secondary text-white fw-semibold"
            >
              <Stars size={20} />
              Outfit Recommendation
            </Button>
          </div>
        </div>
      </div>

    </Container>
  );
}

export default Home;



// import React from 'react';
// import { Container, Row, Col, Image } from 'react-bootstrap';
// import store_1 from '../../assets/images/store_1.jpg';
// import './home.css';

// function Home() {
//   return (
//     <Container fluid className="d-flex flex-column p-0">
//       <div className="store1-style overflow-hidden">
//         <Image src={store_1} alt="Store image" className="w-100 object-fit-cover" />
//       </div>
//     </Container>
//   );
// }

// export default Home;
