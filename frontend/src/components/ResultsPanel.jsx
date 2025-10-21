// src/components/ResultsPanel.jsx
import { Download, Eye, Folder, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../services/api'
import '../styles/components/ResultsPanel.css'
import { formatFileSize } from '../utils/formatFileSize'

const ResultsPanel = ({ onReset }) => {
  const [outputData, setOutputData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // -- Load output files list
  const loadOutputs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.outputs.list()
      setOutputData(response.data)
    } catch (err) {
      console.error('Failed to load outputs:', err)
      setError('Failed to load output files: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOutputs()
  }, [])

  const downloadFile = (category, species, fileName) => {
    const downloadUrl = api.outputs.getDownloadUrl(category, species, fileName)
    
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const previewFile = async (category, species, fileName) => {
    try {
      alert(`Preview functionality for ${fileName} in ${category}/${species} - to be implemented`)
    } catch (error) {
      alert('Preview failed: ' + error.message)
    }
  }

  const downloadAllSpeciesFiles = (species) => {
    // -- Download all archives for this species
    const downloadUrl = api.outputs.getDownloadAllSpeciesUrl(species)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${species}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 組織資料：合併相同物種的 separated 和 table 檔案
  const organizeDataBySpecies = () => {
    if (!outputData) return {}

    const speciesData = {}
    
    // 收集所有物種名稱
    const separatedSpecies = Object.keys(outputData.separated || {})
    const tableSpecies = Object.keys(outputData.table || {})
    const allSpecies = [...new Set([...separatedSpecies, ...tableSpecies])]

    // 為每個物種組織檔案
    allSpecies.forEach(species => {
      speciesData[species] = {
        separated: outputData.separated?.[species] || [],
        table: outputData.table?.[species] || [],
        totalFiles: (outputData.separated?.[species]?.length || 0) + 
                   (outputData.table?.[species]?.length || 0)
      }
    })

    return speciesData
  }

  const renderSpeciesSummary = (species, data) => {
    const { separated, table, totalFiles } = data

    return (
      <div key={species} className="species-summary">
        <div className="line"/>
        <div className="species-header">
          <h3>{species}</h3>
          <div className="species-actions">
            <span className="total-files">{totalFiles} total files</span>
            <button
              className="btn btn-primary"
              onClick={() => downloadAllSpeciesFiles(species)}
              title={`Download all ${species} files`}
            >
              <Download size={16} />
              Download All
            </button>
          </div>
        </div>

        <div className="results-files-summary">
          {/* Separated Files Section */}
          {separated.length > 0 && (
            <div className="file-category">
              <h4>Sequence Files</h4>
              <div className="files-list">
                {separated.map((file) => (
                  <div key={`sep-${file.filename}`} className="file-item">
                    <div className="result-file-info">
                      <span className="file-name">{file.filename}</span>
                      <span className="file-size">({formatFileSize(file.size)})</span>
                    </div>
                    <div className="file-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => previewFile('separated', species, file.filename)}
                        title="Preview file"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => downloadFile('separated', species, file.filename)}
                        title="Download file"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Files Section */}
          {table.length > 0 && (
            <div className="file-category">
              <h4>Table File</h4>
              <div className="files-list">
                {table.map((file) => (
                  <div key={`table-${file.filename}`} className="file-item">
                    <div className="result-file-info">
                      <span className="file-name">{file.filename}</span>
                      <span className="file-size">({formatFileSize(file.size)})</span>
                    </div>
                    <div className="file-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => previewFile('table', species, file.filename)}
                        title="Preview file"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => downloadFile('table', species, file.filename)}
                        title="Download file"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for species with no files */}
          {separated.length === 0 && table.length === 0 && (
            <div className="no-files">
              <p>No files found for this species.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="results-section">
        <div className="loading-state">
          <RefreshCw className="animate-spin" size={24} />
          <h2>Loading Results...</h2>
          <p>Fetching output files from analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="results-section">
        <div className="error-state">
          <h2>Error Loading Results</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={loadOutputs}>
              <RefreshCw size={16} />
              Retry
            </button>
            <button className="btn btn-outline" onClick={onReset}>
              <RotateCcw size={16} />
              Start New Analysis
            </button>
          </div>
        </div>
      </div>
    )
  }

  const speciesData = organizeDataBySpecies()
  const hasResults = Object.keys(speciesData).length > 0

  return (
    <div className="results-section">
      <div className="results-header">
        <h2>Analysis Results</h2>
        <p>DNA analysis has completed. Results are organized by species below.</p>
      </div>

      {hasResults ? (
        <div className="species-results">
          <div className="results-summary">
            <Folder size={20} />
            <span>Found {Object.keys(speciesData).length} species with output files</span>
          </div>
          
          <div className="species-lists">
            {Object.entries(speciesData)
              .sort(([a], [b]) => a.localeCompare(b)) // sort by species name
              .map(([species, data]) => renderSpeciesSummary(species, data))
            }
          </div>
        </div>
      ) : (
        <div className="no-results">
          <h3>No Results Found</h3>
          <p>No output files were found. This might mean:</p>
          <ul>
            <li>Analysis hasn't been run yet</li>
            <li>Analysis is still in progress</li>
            <li>No files were generated during analysis</li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="results-actions">
        <button
          className="btn btn-primary"
          onClick={onReset}
        >
          <RotateCcw size={20} />
          Start New Analysis
        </button>
      </div>
    </div>
  )
}

export default ResultsPanel