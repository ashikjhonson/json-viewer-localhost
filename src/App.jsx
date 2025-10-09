import { useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    video_s3_url: "s3://interview-proctoring/WhatsApp Video 2025-10-01 at 12.49.07 PM.mp4",
    custom_prompt: "Evaluate academic performance",
    original_question: "Evaluate candidate confidence and clarity",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  async function handleAnalyze() {
    // Validate required fields
    if (!formData.video_s3_url.trim() || !formData.custom_prompt.trim() || !formData.original_question.trim()) {
      setData({ error: "All fields are required" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/v1/interview-analysis/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setData({ error: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 800 }}>
      <h2>Interview Analysis</h2>
      
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
            Video S3 URL:
          </label>
          <input
            type="text"
            name="video_s3_url"
            value={formData.video_s3_url}
            onChange={handleInputChange}
            placeholder="s3://bucket-name/video-file.mp4"
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 14
            }}
          />
        </div>

        <div style={{ marginBottom: 15 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
            Custom Prompt:
          </label>
          <textarea
            name="custom_prompt"
            value={formData.custom_prompt}
            onChange={handleInputChange}
            placeholder="Enter your analysis prompt..."
            rows={3}
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 14,
              resize: "vertical"
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
            Original Question:
          </label>
          <textarea
            name="original_question"
            value={formData.original_question}
            onChange={handleInputChange}
            placeholder="Enter the original interview question..."
            rows={3}
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 14,
              resize: "vertical"
            }}
          />
        </div>
      </div>

      <button 
        onClick={handleAnalyze} 
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 16
        }}
      >
        {loading ? "Analyzing..." : "Run Analysis"}
      </button>
      
      {data && (
        <pre style={{ 
          marginTop: 20, 
          background: "#f4f4f4", 
          padding: 10, 
          borderRadius: 4,
          overflow: "auto",
          maxHeight: "400px"
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
