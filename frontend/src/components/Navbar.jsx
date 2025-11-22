// src/components/Navbar.jsx
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Link } from 'react-router-dom';
import logo from '../assets/MEVP_logo.png';
import { useFileContext } from '../contexts/FileContext';
import ThemeToggle from './ThemeToggle.jsx';

function DropdownLink(props) {
  return (
    <NavDropdown.Item as={Link} to={props.to}>
      {props.header}
    </NavDropdown.Item>
  );
}

function MainNavbar({ theme, toggleTheme }) {
  const {
    phylotreeFileName,
    haplotypeFiles,
    selectedHaplotypeIndex,
    csvFileName,
    eDnaSampleFileName,
    eDnaTagsFileName,
    setSelectedHaplotypeIndex,
    handlePhylotreeFileChange,
    handleHaplotypeFileChange,
    handleCsvFileChange,
    handleEDnaSampleChange,
    handleEDnaTagsChange,
  } = useFileContext();

  return (
    <nav className="navbar">
      <Link to='/'>
        <img src={logo} alt="MEVP Logo" className="navbar-logo" />
      </Link>

      <NavDropdown title="Tools">
        <DropdownLink to="/analysis" header="Analysis Pipeline" />
        <DropdownLink to="/phylotree" header="Phylotree" />
        <DropdownLink to="/sequence-alignment" header="Sequence Alignment" />
        <DropdownLink to="/haplotype" header="Haplotype Network" />
      </NavDropdown>

      <div className="file-upload">
        <NavDropdown title="File">
          {/* Upload Newick */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {phylotreeFileName ? (
                <>
                  Current Newick:{" "}
                  <span className="file-name">{phylotreeFileName}</span>
                </>
              ) : (
                "Upload Newick"
              )}
              <input
                type="file"
                accept=".nwk"
                onChange={handlePhylotreeFileChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>

          {/* Upload Fasta (Multiple) */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {haplotypeFiles.length > 0
                ? `Fasta Files: ${haplotypeFiles.length} uploaded`
                : " Upload Fasta (multiple)"}
              <input
                type="file"
                accept=".fa,.fasta,.txt"
                multiple
                onChange={handleHaplotypeFileChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>

          {/* Select which fasta file to use */}
          {haplotypeFiles.length > 0 && (
            <NavDropdown
              title={
                haplotypeFiles[selectedHaplotypeIndex]?.name || "Select Fasta"
              }
              style={{ marginLeft: "50px" ,
                color:  "blue" ,
              }}
            >
              {haplotypeFiles.map((file, idx) => (
                <NavDropdown.Item
                  key={idx}
                  onClick={() => setSelectedHaplotypeIndex(idx)}
                  style={{
                    color: selectedHaplotypeIndex === idx ? "blue" : "black",
                  }}
                >
                  {file.name}
                </NavDropdown.Item>
              ))}
            </NavDropdown>
          )}

          {/* Upload CSV */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {csvFileName ? (
                <>
                  CSV File: <span className="file-name">{csvFileName}</span>
                </>
              ) : (
                "Upload CSV"
              )}
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>

          {/* Upload eDNA Sample Station (XLSX) */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {eDnaSampleFileName ? (
                <>
                  Sample Station:{" "}
                  <span className="file-name">{eDnaSampleFileName}</span>
                </>
              ) : (
                "Upload eDNA Sample Station (XLSX)"
              )}
              <input
                type="file"
                accept=".xlsx"
                onChange={handleEDnaSampleChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>

          {/* Upload eDNA Tags (XLSX) */}
          <NavDropdown.Item as="div">
            <label className="custom-upload-label">
              {eDnaTagsFileName ? (
                <>
                  Tags File:{" "}
                  <span className="file-name">{eDnaTagsFileName}</span>
                </>
              ) : (
                "Upload eDNA_tags__miseq-PE300 (XLSX)"
              )}
              <input
                type="file"
                accept=".xlsx"
                onChange={handleEDnaTagsChange}
                style={{ display: "none" }}
              />
            </label>
          </NavDropdown.Item>
        </NavDropdown>
      </div>

      <div className="theme-toggle-container" style={{ marginLeft: 'auto' }}>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
    </nav>
  );
}

export default MainNavbar;