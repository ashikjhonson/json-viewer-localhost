import { useState, useEffect, useRef } from "react";

// JSON Tree Component
function JsonTree({ data, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  if (data === null || data === undefined) {
    return <span style={{ color: "var(--json-null)" }}>null</span>;
  }

  if (typeof data === "boolean") {
    return <span style={{ color: "var(--json-boolean)" }}>{data.toString()}</span>;
  }

  if (typeof data === "number") {
    return <span style={{ color: "var(--json-number)" }}>{data}</span>;
  }

  if (typeof data === "string") {
    return <span style={{ color: "var(--json-string)" }}>"{data}"</span>;
  }

  if (Array.isArray(data)) {
    return (
      <div>
        <span
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ cursor: "pointer", userSelect: "none", color: "var(--text-muted)" }}
        >
          {isExpanded ? "▼" : "▶"} [
        </span>
        {isExpanded && (
          <div style={{ marginLeft: 20, borderLeft: "1px solid var(--border-color)", paddingLeft: 10 }}>
            {data.map((item, index) => (
              <div key={index} style={{ marginTop: 4 }}>
                <span style={{ color: "var(--text-muted)" }}>{index}: </span>
                <JsonTree data={item} level={level + 1} />
                {index < data.length - 1 && <span style={{ color: "var(--text-muted)" }}>,</span>}
              </div>
            ))}
          </div>
        )}
        <span style={{ color: "var(--text-muted)" }}>]</span>
      </div>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    return (
      <div>
        <span
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ cursor: "pointer", userSelect: "none", color: "var(--text-muted)" }}
        >
          {isExpanded ? "▼" : "▶"} {"{"}
        </span>
        {isExpanded && (
          <div style={{ marginLeft: 20, borderLeft: "1px solid var(--border-color)", paddingLeft: 10 }}>
            {keys.map((key, index) => (
              <div key={key} style={{ marginTop: 4 }}>
                <span style={{ color: "var(--json-key)", fontWeight: "bold" }}>"{key}"</span>
                <span style={{ color: "var(--text-muted)" }}>: </span>
                <JsonTree data={data[key]} level={level + 1} />
                {index < keys.length - 1 && <span style={{ color: "var(--text-muted)" }}>,</span>}
              </div>
            ))}
          </div>
        )}
        <span style={{ color: "var(--text-muted)" }}>{"}"}</span>
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [polling, setPolling] = useState(false);
  const [formData, setFormData] = useState({
    video_s3_url: "s3://interview-proctoring/WhatsApp Video 2025-10-01 at 12.49.07 PM.mp4",
    custom_prompt: "Evaluate academic performance",
    original_question: "Evaluate candidate confidence and clarity",
  });
  const [recentUrls, setRecentUrls] = useState([]);
  const [showRecentUrls, setShowRecentUrls] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pollingIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Load recent URLs from localStorage on component mount
  useEffect(() => {
    const savedUrls = localStorage.getItem('recentS3Urls');
    if (savedUrls) {
      setRecentUrls(JSON.parse(savedUrls));
    }
  }, []);

  // Cleanup polling and timer intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  // Save recent URLs to localStorage
  const saveToRecentUrls = (url) => {
    if (!url.trim()) return;
    
    const updatedUrls = [url, ...recentUrls.filter(item => item !== url)].slice(0, 50); // Keep only 10 recent URLs
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

  // Poll status function
  const pollStatus = async (interviewId) => {
    try {
      const res = await fetch(`http://localhost:8000/getStatus/${interviewId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer your_api_token_here",
        },
      });
      
      if (!res.ok) {
        throw new Error(`Status check failed: ${res.statusText}`);
      }
      
      const statusData = await res.json();
      setStatus(statusData);
      setStatusMessage(`Status: ${statusData.status} - ${statusData.message || ""}`);
      
      // Check for terminal states (completed, failed, etc.)
      const terminalStates = ["completed", "failed", "error"];
      const isTerminalState = terminalStates.includes(statusData.status?.toLowerCase());
      
      if (isTerminalState) {
        // Stop polling for any terminal state
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Stop timer on failed/error (timer also stops when result loads)
        if (statusData.status !== "completed" && timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setPolling(false);
        
        if (statusData.status === "completed") {
          // Fetch the result only if completed successfully
          await fetchResult(interviewId);
        } else {
          // For failed/error states, show error in data display
          setData({
            error: statusData.message || "Analysis failed",
            status: statusData.status,
            interview_id: interviewId,
            ...statusData
          });
          setStatusMessage(`Status: ${statusData.status} - ${statusData.message || "Analysis failed"}`);
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage(`Error checking status: ${err.message}`);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setPolling(false);
    }
  };

  // Fetch result function
  const fetchResult = async (interviewId) => {
    try {
      setStatusMessage("Fetching result...");
      const res = await fetch(`http://localhost:8000/getResult/${interviewId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer your_api_token_here",
        },
      });
      
      if (!res.ok) {
        throw new Error(`Result fetch failed: ${res.statusText}`);
      }
      
      const resultData = await res.json();
      setData(resultData);
      // Stop the timer once result is loaded
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setStatusMessage("Analysis completed successfully!");
    } catch (err) {
      console.error(err);
      setData({ error: `Failed to fetch result: ${err.message}` });
      setStatusMessage(`Error fetching result: ${err.message}`);
      // Stop timer on error
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Convert elapsed time (seconds) to MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Remove sensitive/unwanted keys (like distraction_level) from the proctoring object before display
  const removeKeyDeep = (obj, keyToRemove) => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map((item) => removeKeyDeep(item, keyToRemove));
    if (typeof obj !== "object") return obj;

    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === keyToRemove) continue; // skip this key
      result[k] = removeKeyDeep(v, keyToRemove);
    }
    return result;
  };

  // Only show proctoring_analysis in the UI when available; hide any distraction_level fields
  const displayProctoring = data && data.proctoring_analysis ? removeKeyDeep(data.proctoring_analysis, "distraction_level") : null;

  async function handleAnalyze() {
    // Validate required fields
    if (!formData.video_s3_url.trim() || !formData.custom_prompt.trim() || !formData.original_question.trim()) {
      setData({ error: "All fields are required" });
      return;
    }

    // Save URL to recent URLs before making the request
    saveToRecentUrls(formData.video_s3_url);

    setLoading(true);
    setData(null);
    setStatus(null);
    setStatusMessage("");
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    
    // Start timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);
    }, 100);
    
    try {
      const res = await fetch("http://localhost:8000/interview-analysis/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer your_api_token_here",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        throw new Error(`Request failed: ${res.statusText}`);
      }
      
      const json = await res.json();
      
      // Extract interview_id from response
      const interviewId = json.interview_id;
      
      if (!interviewId) {
        throw new Error("No interview_id in response");
      }
      
      setStatusMessage(`Interview submitted. ID: ${interviewId}`);
      
      // Start polling for status
      setPolling(true);
      
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      // Poll immediately
      await pollStatus(interviewId);
      
      // Then poll every 2 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollStatus(interviewId);
      }, 2000);
      
    } catch (err) {
      console.error(err);
      setData({ error: `Request failed: ${err.message}` });
      setStatusMessage(`Error: ${err.message}`);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setPolling(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      padding: 20, 
      fontFamily: "sans-serif", 
      height: "100vh",
      display: "flex",
      gap: 20,
      overflow: "hidden",
      backgroundColor: "var(--bg-primary)",
      color: "var(--text-primary)"
    }}>
      {/* Left Section - Form */}
      <div style={{
        width: "45%",
        minWidth: 400,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        paddingRight: 10
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>Interview Analysis</h2>
        
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
                border: `1px solid var(--border-color)`,
                borderRadius: 4,
                fontSize: 14,
                paddingRight: recentUrls.length > 0 ? "100px" : "8px",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)"
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
                  background: "var(--bg-tertiary)",
                  border: `1px solid var(--border-color)`,
                  borderRadius: "3px",
                  fontSize: "12px",
                  cursor: "pointer",
                  color: "var(--text-primary)"
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
              border: "1px solid var(--border-color)",
              borderRadius: 4,
              fontSize: 14,
              resize: "vertical",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)"
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
              border: "1px solid var(--border-color)",
              borderRadius: 4,
              fontSize: 14,
              resize: "vertical",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)"
            }}
          />
        </div>
      </div>

      <button 
        onClick={handleAnalyze} 
        disabled={loading || polling}
        style={{
          padding: "10px 20px",
          backgroundColor: (loading || polling) ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: (loading || polling) ? "not-allowed" : "pointer",
          fontSize: 16
        }}
      >
        {loading ? "Submitting..." : polling ? "Polling Status..." : "Run Analysis"}
      </button>

        {statusMessage && (
          <div style={{
            marginTop: 15,
            padding: 10,
            background: polling 
              ? "var(--warning-bg)" 
              : status?.status === "failed" || status?.status === "error"
              ? "var(--error-bg)"
              : "var(--success-bg)",
            border: `1px solid ${
              polling 
                ? "var(--warning-text)" 
                : status?.status === "failed" || status?.status === "error"
                ? "var(--error-text)"
                : "var(--success-text)"
            }`,
            borderRadius: 4,
            fontSize: 14,
            color: status?.status === "failed" || status?.status === "error" 
              ? "var(--error-text)" 
              : polling
              ? "var(--warning-text)"
              : "var(--success-text)"
          }}>
            {statusMessage}
            {(polling || elapsedTime > 0) && (
              <div style={{ marginTop: 8, fontWeight: "bold", fontSize: 16 }}>
                ⏱️ Time: {formatTime(elapsedTime)}
              </div>
            )}
          </div>
        )}

        {status && (
          <div style={{ 
            marginTop: 15, 
            background: "#f8f9fa", 
            padding: 10, 
            borderRadius: 4,
            fontSize: 13
          }}>
            <div style={{ marginBottom: 5, fontWeight: "bold" }}>Status Details:</div>
            <div style={{ marginLeft: 10 }}>
              <div>Interview ID: {status.interview_id}</div>
              <div>
                Status: <strong style={{
                  color: status.status === "completed" 
                    ? "#28a745" 
                    : status.status === "failed" || status.status === "error"
                    ? "#dc3545"
                    : "inherit"
                }}>{status.status}</strong>
              </div>
              {status.submitted_at && <div>Submitted: {new Date(status.submitted_at).toLocaleString()}</div>}
              {status.started_at && <div>Started: {new Date(status.started_at).toLocaleString()}</div>}
              {status.completed_at && <div>Completed: {new Date(status.completed_at).toLocaleString()}</div>}
              {status.message && (
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  background: status.status === "failed" || status.status === "error" ? "#f8d7da" : "#d4edda",
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  {status.message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Section - Result Tree */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderLeft: "2px solid #e0e0e0",
        paddingLeft: 20
      }}>
        {/* <h2 style={{ marginTop: 0, marginBottom: 20 }}>Result</h2> */}
        
        {data ? (
          <div style={{ 
            flex: 1,
            background: "var(--bg-secondary)", 
            padding: 15, 
            borderRadius: 4,
            overflow: "auto",
            border: "1px solid var(--border-color)",
            minHeight: 0
          }}>
            <JsonTree data={data} />
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-secondary)",
            borderRadius: 4,
            border: "2px dashed var(--border-color)",
            color: "var(--text-secondary)"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📋</div>
              <div>No result yet. Submit an analysis request to see results here.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
