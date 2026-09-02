import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useState } from 'react';

const AISettings = () => {
  const [settings, setSettings] = useState({
    llmModel: 'llama3.2:3b',
    embeddingModel: 'nomic-embed-text',
    chunkSize: '800',
    chunkOverlap: '150',
    topK: '5',
    temperature: '0.2',
  });

  const handleChange = (field: string, value: string) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = () => {
    alert('AI Settings saved successfully!');
  };

  return (
    <div>
      <div className="ai-settings-header-banner mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className="ai-settings-icon-badge" aria-label="AI settings">⚙️</span>
          <div className="ai-settings-header-text">AI Settings</div>
        </div>
      </div>

      <style>{`
        .ai-settings-header-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.1rem 1.4rem;
          border-radius: 1.4rem;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 55%, rgba(79, 70, 229, 0.92) 100%);
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .ai-settings-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.9rem;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #f8fafc;
          font-size: 1.2rem;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        }

        .ai-settings-header-text {
          color: #f8fafc;
          font-size: clamp(1.8rem, 2vw, 2.7rem);
          font-weight: 800;
          letter-spacing: -0.06em;
        }
      `}</style>

      <Row className="g-3">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light border-bottom">
              <Card.Title className="mb-0">LLM Configuration</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>LLM Model</Form.Label>
                      <Form.Select
                        value={settings.llmModel}
                        onChange={(e) => handleChange('llmModel', e.target.value)}
                      >
                        <option>llama3.2:3b</option>
                        <option>llama2:7b</option>
                        <option>mistral:7b</option>
                        <option>neural-chat:7b</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Embedding Model</Form.Label>
                      <Form.Select
                        value={settings.embeddingModel}
                        onChange={(e) => handleChange('embeddingModel', e.target.value)}
                      >
                        <option>nomic-embed-text</option>
                        <option>all-minilm</option>
                        <option>bge-small</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Chunk Size</Form.Label>
                      <Form.Control
                        type="number"
                        value={settings.chunkSize}
                        onChange={(e) => handleChange('chunkSize', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Chunk Overlap</Form.Label>
                      <Form.Control
                        type="number"
                        value={settings.chunkOverlap}
                        onChange={(e) => handleChange('chunkOverlap', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Top K</Form.Label>
                      <Form.Control
                        type="number"
                        value={settings.topK}
                        onChange={(e) => handleChange('topK', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Temperature</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={settings.temperature}
                        onChange={(e) => handleChange('temperature', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="gap-2 d-flex">
                  <Button variant="primary" onClick={handleSave}>
                    💾 Save Settings
                  </Button>
                  <Button variant="secondary">↺ Reset to Defaults</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm bg-light">
            <Card.Body>
              <h5 className="mb-3">📖 Quick Reference</h5>
              <div className="small">
                <p><strong>Chunk Size:</strong> Ideal is 800-1000 characters</p>
                <p><strong>Chunk Overlap:</strong> 10-20% of chunk size</p>
                <p><strong>Top K:</strong> Number of documents to retrieve (5-10)</p>
                <p><strong>Temperature:</strong> 0 = deterministic, 1 = creative</p>
                <p><strong>Recommended:</strong> Temperature 0.2 for production</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AISettings;
