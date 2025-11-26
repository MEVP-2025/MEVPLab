import { useState, useEffect } from "react";
import "./styles/HaplotypeReducer.css";

const HaplotypeReducer = () => {
  const [hapFasta, setHapFasta] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [reduceSize, setReduceSize] = useState(30);
  const [outputFilename, setOutputFilename] = useState(`output.reduce_${reduceSize}.fa`);
  const [loading, setLoading] = useState(false);

  // 每次 reduceSize 改变时，自动更新 outputFilename
  useEffect(() => {
    setOutputFilename(`output.reduce_${reduceSize}.fa`);
  }, [reduceSize]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!hapFasta || !excelFile) {
      alert("Please upload both FASTA and Excel files.");
      return;
    }

    const formData = new FormData();
    formData.append("hapFastaFile", hapFasta);
    formData.append("excelFile", excelFile);
    formData.append("reduceSize", reduceSize);
    formData.append("outputFilename", outputFilename);

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/haplotypes/reduceHaplotypes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        alert("Execution error: " + errorText);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", outputFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ Request failed:", err);
      alert("Failed to send to backend or download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="HaplotypeReducer-container">
      <h3> Haplotype Reduce tool</h3>
      <form onSubmit={handleSubmit}>
        {/* FASTA file */}
        <div className="HaplotypeReducer-input-container">
          <label>FASTA (.msa.asv.fa): </label>
          <input
            id="fastaFile"
            type="file"
            accept=".fa"
            style={{ display: "none" }}
            onChange={(e) => setHapFasta(e.target.files[0])}
          />
          <label htmlFor="fastaFile" className="HaplotypeReducer-file-label">
            Choose File
          </label>
          <span className="HaplotypeReducer-file-name">
            {hapFasta ? hapFasta.name : "No file "}
          </span>
        </div>

        {/* Excel file */}
        <div className="HaplotypeReducer-input-container">
          <label>Sample station Excel (.xlsx): </label>
          <input
            id="excelFile"
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={(e) => setExcelFile(e.target.files[0])}
          />
          <label htmlFor="excelFile" className="HaplotypeReducer-file-label">
            Choose File
          </label>
          <span className="HaplotypeReducer-file-name">
            {excelFile ? excelFile.name : "No file "}
          </span>
        </div>

        {/* Reduce quantity */}
        <div className="HaplotypeReducer-input-container">
          <label>Reduce quantity: </label>
          <input
            type="number"
            value={reduceSize}
            onChange={(e) => setReduceSize(e.target.value)}
          />
        </div>

        {/* Output filename */}
        <div className="HaplotypeReducer-input-container">
          <label>Output file name: </label>
          <input
            type="text"
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
          />
        </div>

        {/* Export button */}
        <button type="submit" className="HaplotypeReducer-submit-button" disabled={loading}>
          {loading ? "Processing..." : "Export"}
        </button>
      </form>
    </div>
  );
};

export default HaplotypeReducer;
