import { useLocation } from 'react-router-dom';
import { useFileContext } from '../../contexts/FileContext';
import { FastaSelector, UploadMenuItem } from './NavComponents';

export const FileMenuContent = ({ closeMenu }) => {
  const location = useLocation();
  const context = useFileContext();
  const path = location.pathname;

  // Phylotree Page
  if (path === '/phylotree') {
    return (
      <UploadMenuItem
        label={context.phylotreeFileName ? `Current: ${context.phylotreeFileName}` : "Upload Newick"}
        accept=".nwk,.newick,.txt"
        onChange={(e) => { context.handlePhylotreeFileChange(e); closeMenu(); }}
      />
    );
  }

  // Sequence Alignment Page
  if (path === '/sequence-alignment') {
    return (
      <>
        <UploadMenuItem
          label="Upload MSA"
          subLabel={context.haplotypeFiles.length > 0 ? `${context.haplotypeFiles.length} files uploaded` : null}
          accept=".fa,.fasta,.txt"
          onChange={(e) => { context.handleHaplotypeFileChange(e); closeMenu(); }}
        />
        <FastaSelector 
          files={context.haplotypeFiles}
          selectedIndex={context.selectedHaplotypeIndex}
          onSelect={context.setSelectedHaplotypeIndex}
        />
      </>
    );
  }

  // Haplotype Network Page
  if (path === '/haplotype') {
    return (
      <>
        <UploadMenuItem
          label="Upload MSA"
          subLabel={context.haplotypeFiles.length > 0 ? `${context.haplotypeFiles.length} files uploaded` : null}
          accept=".fa,.fasta,.txt"
          onChange={(e) => { context.handleHaplotypeFileChange(e); closeMenu(); }}
        />
        <FastaSelector 
          files={context.haplotypeFiles}
          selectedIndex={context.selectedHaplotypeIndex}
          onSelect={context.setSelectedHaplotypeIndex}
        />
        
        <div style={{ borderTop: '1px solid var(--border)', margin: '5px 0' }}></div>

        <UploadMenuItem
          label={context.csvFileName ? `CSV: ${context.csvFileName}` : "Upload CSV"}
          accept=".csv"
          onChange={(e) => { context.handleCsvFileChange(e); closeMenu(); }}
        />

        <UploadMenuItem
          label={context.eDnaSampleFileName ? `eDNA: ${context.eDnaSampleFileName}` : "Upload eDNA (XLSX)"}
          accept=".xlsx"
          onChange={(e) => { context.handleEDnaSampleChange(e); closeMenu(); }}
        />
      </>
    );
  }

  return null;
};