import { useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/v1/interview-analysis/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          video_s3_url: "s3://interview-proctoring/WhatsApp Video 2025-10-01 at 12.49.07 PM.mp4",
          custom_prompt: "Evaluate academic performance",
          original_question: "Evaluate candidate confidence and clarity",
        }),
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
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Interview Analysis</h2>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Run Analysis"}
      </button>
      {data && (
        <pre style={{ marginTop: 20, background: "#f4f4f4", padding: 10 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
