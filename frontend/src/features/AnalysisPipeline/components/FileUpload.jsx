// src/components/FileUpload.jsx
import { File, Settings, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import api from '../services/api'
import '../styles/components/FileUpload.css'
import { formatFileSize } from '../utils/formatFileSize'

const FileUpload = ({ onFilesUploaded }) => {
  const [files, setFiles] = useState({
    R1: null,
    R2: null,
    barcode: null
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [detectingSpecies, setDetectingSpecies] = useState(false)
  const [error, setError] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach(file => {
      let fileType = 'R1'
      if (file.name.includes('R2') || file.name.includes('_2')) {
        fileType = 'R2'
      } else if (file.name.endsWith('.csv')) {
        fileType = 'barcode'
      }
      
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }))
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.fq', '.fastq'],
      'text/csv': ['.csv']
    },
    multiple: true
  })

  const removeFile = (type) => {
    setFiles(prev => ({
      ...prev,
      [type]: null
    }))
  }

  const uploadFiles = async () => {
    if (!files.R1 || !files.R2) {
      setError('Please select both R1 and R2 files')
      return
    }

    if (!files.barcode) {
      setError('Please select barcode CSV file')
      return
    }

    try {
      // Step 1: Upload files
      setUploading(true)
      setUploadProgress(0)
      setError(null)

      const formData = new FormData()
      formData.append('R1', files.R1)
      formData.append('R2', files.R2)
      formData.append('barcode', files.barcode)

      const uploadResponse = await api.files.uploadPaired(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        setUploadProgress(progress)
      })

      setUploading(false)

      // Step 2: Detect species automatically
      setDetectingSpecies(true)
      
      const detectionResponse = await api.analysis.pipeline.detectSpecies({
        barcodeFile: `uploads/${uploadResponse.data.files.barcode.filename}`
      })

      if (detectionResponse.data.success) {
        const species = detectionResponse.data.data.species
        
        // Quality config (default)
        const defaultQualityConfig = {}
        species.forEach(sp => {
          defaultQualityConfig[sp] = 0 // default 0
        })

        // 準備完整的檔案資訊，包含物種檢測結果
        const filesWithSpecies = {
          ...uploadResponse.data.files,
          detectedSpecies: species,
          defaultQualityConfig: defaultQualityConfig
        }

        onFilesUploaded(filesWithSpecies)
      } else {
        setError('Species detection failed. You can still proceed with manual configuration.')
        onFilesUploaded(uploadResponse.data.files)
      }

    } catch (error) {
      console.error('Upload or species detection failed:', error)
      setError(error.response?.data?.error || 'Upload or species detection failed')
    } finally {
      setUploading(false)
      setDetectingSpecies(false)
      setUploadProgress(0)
    }
  }

  const isProcessing = uploading || detectingSpecies

  return (
    <div className="upload-section">
      <h2>Upload Files</h2>
      <p>Upload R1, R2 FASTQ files and barcode CSV file</p>

      <div className="file-drop-zone" {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <div className="drop-active">
            <Upload size={48} />
            <p>Drop files here...</p>
            <small>Supported: .fq, .fastq, .csv</small>
          </div>
        ) : (
          <div className="drop-idle">
            <Upload size={48} />
            <p>Drag & drop files here, or click to select</p>
            <small>Supported: .fq, .fastq, .csv</small>
          </div>
        )}
      </div>

      {/* Selected Files */}
      <div className="selected-files">
        {Object.entries(files).map(([type, file]) => {
          if (!file) return null
          return (
            <div key={type} className="file-item">
              <File size={20} />
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">({formatFileSize(file.size)})</span>
                <span className="file-type">{type}</span>
              </div>
              <button 
                className="remove-btn" 
                onClick={() => removeFile(type)}
                disabled={isProcessing}
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span>Uploading... {uploadProgress}%</span>
        </div>
      )}

      {error && (
        <div className="alert error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Species Detection Progress */}
      {detectingSpecies && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill detecting" />
          </div>
          <span>
            <div className='detecting-icon'>
              <Settings size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Detecting projects...
            </div>
          </span>
        </div>
      )}

      {/* Upload Button */}
      <div className="upload-actions">
        <div className="file-status">
          <span className={files.R1 ? 'ready' : 'missing'}>
            R1: {files.R1 ? '✓' : '✗'}
          </span>
          <span className={files.R2 ? 'ready' : 'missing'}>
            R2: {files.R2 ? '✓' : '✗'}
          </span>
          <span className={files.barcode ? 'ready' : 'missing'}>
            Barcode: {files.barcode ? '✓' : '✗'}
          </span>
        </div>

        <button
          className="btn btn-primary"
          onClick={uploadFiles}
          disabled={!files.R1 || !files.R2 || !files.barcode || isProcessing}
        >
          {uploading ? 'Uploading Files...' : 
           detectingSpecies ? 'Detecting Projects...' : 
           'Upload & Detect Projects'}
        </button>
      </div>
    </div>
  )
}

export default FileUpload