import React, { useState, useMemo } from 'react';
import { Accordion, Form, InputGroup } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';
import { FaqItem } from '../../types'; // Adjust path if necessary

// Define the props for this component
interface FaqSectionProps {
  data: FaqItem[];
}

export function FaqSection({ data }: FaqSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = useMemo(() => {
    if (!searchTerm.trim()) {
      return data;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.filter(faq =>
      faq.question.toLowerCase().includes(lowercasedTerm) ||
      faq.answer.toLowerCase().includes(lowercasedTerm)
    );
  }, [data, searchTerm]);

  const faqsToDisplay = filteredFaqs.slice(0, 5);

  return (
    // We remove the class from the <section> as it's no longer needed here.
    <section className='d-block align-items-start newsletter-section pt-0'>
      {/* --- CHANGE #1: Create a new flex container for the header and search box --- */}
      {/* This div will align its children (the h2 and the search div) in a row. */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        
        {/* The Header Text. We remove its bottom margin as the parent now handles it. */}
        <h2 className="mb-0">Frequently Asked Questions</h2>

        {/* A wrapper for the search input to control its size */}
        <div style={{ minWidth: '300px' }}>
          <InputGroup>
            <InputGroup.Text>
              <Search />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      {/* --- The rest of your component logic remains the same --- */}
      {faqsToDisplay.length > 0 ? (
        <Accordion defaultActiveKey={searchTerm ? "0" : undefined} flush>
          {faqsToDisplay.map((faqItem, index) => (
            <Accordion.Item eventKey={String(index)} key={index}>
              <Accordion.Header as="h5">{faqItem.question}</Accordion.Header>
              <Accordion.Body>
                {faqItem.answer}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <p className="text-muted text-center mt-3">
          No matching FAQs found.
        </p>
      )}
    </section>
  );
}