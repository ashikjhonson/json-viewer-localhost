import { useState, useEffect } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    video_s3_url: "s3://interview-proctoring/WhatsApp Video 2025-10-01 at 12.49.07 PM.mp4",
    custom_prompt: "Evaluate academic performance",
    original_question: "Evaluate candidate confidence and clarity",
  });
  const [recentUrls, setRecentUrls] = useState([]);
  const [showRecentUrls, setShowRecentUrls] = useState(false);

  // Load recent URLs from localStorage on component mount
  useEffect(() => {
    const savedUrls = localStorage.getItem('recentS3Urls');
    if (savedUrls) {
      setRecentUrls(JSON.parse(savedUrls));
    }
  }, []);

  // Save recent URLs to localStorage
  const saveToRecentUrls = (url) => {
    if (!url.trim()) return;
    
    const updatedUrls = [url, ...recentUrls.filter(item => item !== url)].slice(0, 10); // Keep only 10 recent URLs
    setRecentUrls(updatedUrls);
    localStorage.setItem('recentS3Urls', JSON.stringify(updatedUrls));
  };

  // Handle selecting a recent URL
  const selectRecentUrl = (url) => {
    setFormData(prev => ({
      ...prev,
      video_s3_url: url
    }));
    setShowRecentUrls(false);
  };

  // Clear recent URLs
  const clearRecentUrls = () => {
    setRecentUrls([]);
    localStorage.removeItem('recentS3Urls');
  };

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

    // Save URL to recent URLs before making the request
    saveToRecentUrls(formData.video_s3_url);

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
          <div style={{ position: "relative" }}>
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
                fontSize: 14,
                paddingRight: recentUrls.length > 0 ? "100px" : "8px"
              }}
            />
            {recentUrls.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRecentUrls(!showRecentUrls)}
                style={{
                  position: "absolute",
                  right: "5px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "4px 8px",
                  background: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: "3px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Recent ({recentUrls.length})
              </button>
            )}
          </div>
          
          {showRecentUrls && recentUrls.length > 0 && (
            <div style={{
              marginTop: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "white",
              maxHeight: "200px",
              overflowY: "auto",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <div style={{
                padding: "8px 12px",
                borderBottom: "1px solid #eee",
                background: "#f8f9fa",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>
                  Recent S3 URLs
                </span>
                <button
                  onClick={clearRecentUrls}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc3545",
                    cursor: "pointer",
                    fontSize: "11px",
                    textDecoration: "underline"
                  }}
                >
                  Clear All
                </button>
              </div>
              {recentUrls.map((url, index) => (
                <div
                  key={index}
                  onClick={() => selectRecentUrl(url)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: index < recentUrls.length - 1 ? "1px solid #eee" : "none",
                    fontSize: "13px",
                    wordBreak: "break-all"
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#f8f9fa"}
                  onMouseLeave={(e) => e.target.style.background = "white"}
                >
                  {url}
                </div>
              ))}
            </div>
          )}
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
