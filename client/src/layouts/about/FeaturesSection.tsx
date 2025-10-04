import { Container, Row, Col } from 'react-bootstrap';
import * as icons from 'react-bootstrap-icons'; // Import the entire icon library dynamically
import { Feature } from '../../types';

interface FeaturesSectionProps {
  data: Feature[];
}

export function FeaturesSection({ data }: FeaturesSectionProps) {
  return (
    <Container as="section" className="text-center h-auto py-0 my-0 bg-transparent">
        <Row className="gy-4">
          {data.map((feature, index) => {
            // This is the advanced pattern from your Home page
            const FeatureIcon = icons[feature.icon as keyof typeof icons];
            
            return (
              <Col key={index} md={3}>
                <div className="feature-icon-wrapper">
                  {FeatureIcon ? (
                    <FeatureIcon size={28} color="white" className="m-auto" />
                  ) : (
                    <icons.QuestionCircle size={28} color="white" className="m-auto" />
                  )}
                </div>
                <h5 className="mt-2">{feature.heading}</h5>
                <p>{feature.text}</p>
              </Col>
            );
          })}
        </Row>
    </Container>
  );
}