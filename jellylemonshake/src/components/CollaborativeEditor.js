import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/components/CollaborativeEditor.css';

function CollaborativeEditor({ roomId, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [compilationStatus, setCompilationStatus] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState('');
  const [showCodePaste, setShowCodePaste] = useState(false);
  const [pastedCode, setPastedCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [fileName, setFileName] = useState('');
  const [showSyntaxHighlighting, setShowSyntaxHighlighting] = useState(true);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (roomId) {
      loadProjects();
    }
  }, [roomId]);

  const loadProjects = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/room/${roomId}`);
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const createProject = async () => {
    const projectName = prompt('Enter project name:');
    if (!projectName) return;

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          description: `Collaborative project for room ${roomId}`,
          roomId,
          createdBy: user?.email || user?.username,
          projectType: 'react'
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Project created successfully!');
        loadProjects();
        setSelectedProject(data.project);
        loadProjectFiles(data.project.projectId);
      } else {
        setError(data.message || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
      console.error('Error creating project:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectFiles = async (projectId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.project.files || []);
        if (data.project.files && data.project.files.length > 0) {
          setSelectedFile(data.project.files[0]);
          setFileContent(data.project.files[0].content);
        }
      }
    } catch (err) {
      console.error('Error loading project files:', err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedProject) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', user?.email || user?.username);

      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('File uploaded successfully!');
        loadProjectFiles(selectedProject.projectId);
      } else {
        setError(data.message || 'Failed to upload file');
      }
    } catch (err) {
      setError('Failed to upload file');
      console.error('Error uploading file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileContent(file.content);
  };

  const handleFileContentChange = (content) => {
    setFileContent(content);
  };

  const saveFileContent = async () => {
    if (!selectedFile || !selectedProject) return;

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/${selectedFile._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: fileContent,
          lastModifiedBy: user?.email || user?.username
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('File saved successfully!');
        loadProjectFiles(selectedProject.projectId);
      } else {
        setError(data.message || 'Failed to save file');
      }
    } catch (err) {
      setError('Failed to save file');
      console.error('Error saving file:', err);
    } finally {
      setLoading(false);
    }
  };

  const compileProject = async () => {
    if (!selectedProject) return;

    setCompilationStatus('compiling');
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          compiledBy: user?.email || user?.username
        })
      });

      const data = await response.json();
      if (data.success) {
        setCompilationStatus('success');
        // Use the full API URL for preview
        const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
        setPreviewUrl(`${apiUrl}${data.compilation.previewUrl}`);
        setSuccess('Project compiled successfully!');
      } else {
        setCompilationStatus('error');
        setError(data.message || 'Compilation failed');
      }
    } catch (err) {
      setCompilationStatus('error');
      setError('Failed to compile project');
      console.error('Error compiling project:', err);
    }
  };

  const handleCodePaste = () => {
    setShowCodePaste(true);
    setPastedCode('');
    setFileName('');
    setSelectedLanguage('javascript');
  };

  const savePastedCode = async () => {
    if (!pastedCode.trim() || !fileName.trim() || !selectedProject) {
      setError('Please provide code, filename, and select a project');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsproject-backend.onrender.com';
      
      // Create a file object for the pasted code
      const fileData = {
        projectId: selectedProject.projectId,
        fileName: fileName,
        filePath: `/${fileName}`,
        fileType: selectedLanguage,
        content: pastedCode,
        uploadedBy: user?.email || user?.username,
        lastModifiedBy: user?.email || user?.username,
        metadata: {
          size: pastedCode.length,
          encoding: 'utf8',
          mimeType: getMimeType(selectedLanguage)
        }
      };

      const response = await fetch(`${apiUrl}/api/projects/${selectedProject.projectId}/files/paste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileData)
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Code pasted and saved successfully!');
        setShowCodePaste(false);
        setPastedCode('');
        setFileName('');
        loadProjectFiles(selectedProject.projectId);
      } else {
        setError(data.message || 'Failed to save pasted code');
      }
    } catch (err) {
      setError('Failed to save pasted code');
      console.error('Error saving pasted code:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMimeType = (language) => {
    const mimeTypes = {
      'javascript': 'text/javascript',
      'css': 'text/css',
      'html': 'text/html',
      'json': 'application/json'
    };
    return mimeTypes[language] || 'text/plain';
  };

  const getFileExtension = (language) => {
    const extensions = {
      'javascript': '.js',
      'css': '.css',
      'html': '.html',
      'json': '.json'
    };
    return extensions[language] || '.txt';
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    if (!fileName || fileName === '') {
      setFileName(`file${getFileExtension(language)}`);
    } else if (!fileName.includes('.')) {
      setFileName(`${fileName}${getFileExtension(language)}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="collaborative-editor-overlay" onClick={onClose}>
        <div className="collaborative-editor-container" onClick={e => e.stopPropagation()}>
          <div className="error-message">
            Please log in to use the collaborative editor.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collaborative-editor-overlay" onClick={onClose}>
      <div className="collaborative-editor-container" onClick={e => e.stopPropagation()}>
        <div className="collaborative-editor-header">
          <h2>🚀 Collaborative Code Editor</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="collaborative-editor-content">
          {/* Project Selection */}
          <div className="project-section">
            <div className="section-header">
              <h3>📁 Projects</h3>
              <button onClick={createProject} className="btn-primary" disabled={loading}>
                + New Project
              </button>
            </div>
            
            <div className="projects-list">
              {projects.map(project => (
                <div 
                  key={project.projectId}
                  className={`project-item ${selectedProject?.projectId === project.projectId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProject(project);
                    loadProjectFiles(project.projectId);
                  }}
                >
                  <div className="project-name">{project.name}</div>
                  <div className="project-meta">
                    {project.collaborators.length} collaborator{project.collaborators.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Management */}
          {selectedProject && (
            <div className="files-section">
              <div className="section-header">
                <h3>📄 Files</h3>
                <div className="file-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".js,.jsx,.ts,.tsx,.css,.html,.json,.md,.txt"
                    style={{ display: 'none' }}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    📤 Upload File
                  </button>
                  <button 
                    onClick={handleCodePaste}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    📝 Paste Code
                  </button>
                  <button 
                    onClick={compileProject}
                    className="btn-primary"
                    disabled={loading || compilationStatus === 'compiling'}
                  >
                    {compilationStatus === 'compiling' ? '⏳ Compiling...' : '🔨 Compile'}
                  </button>
                </div>
              </div>

              <div className="files-grid">
                <div className="files-list">
                  {files.map(file => (
                    <div 
                      key={file._id}
                      className={`file-item ${selectedFile?._id === file._id ? 'active' : ''}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="file-icon">
                        {file.fileType === 'javascript' ? '📜' : 
                         file.fileType === 'css' ? '🎨' : 
                         file.fileType === 'html' ? '🌐' : '📄'}
                      </div>
                      <div className="file-info">
                        <div className="file-name">{file.fileName}</div>
                        <div className="file-meta">
                          {file.fileType} • {file.metadata?.size ? Math.round(file.metadata.size / 1024) + 'KB' : 'Unknown size'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedFile && (
                  <div className="file-editor">
                    <div className="editor-header">
                      <span className="file-name">{selectedFile.fileName}</span>
                      <button 
                        onClick={saveFileContent}
                        className="btn-save"
                        disabled={loading}
                      >
                        💾 Save
                      </button>
                    </div>
                    <textarea
                      value={fileContent}
                      onChange={(e) => handleFileContentChange(e.target.value)}
                      className="code-editor"
                      placeholder="Start coding..."
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compilation Status */}
          {compilationStatus === 'success' && previewUrl && (
            <div className="preview-section">
              <h3>👀 Live Preview</h3>
              <div className="preview-container">
                <iframe
                  src={previewUrl}
                  className="preview-iframe"
                  title="Project Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  allow="camera; microphone; fullscreen"
                />
              </div>
              <div className="preview-actions">
                <button 
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="btn-secondary"
                >
                  🔗 Open in New Tab
                </button>
                <button 
                  onClick={() => setPreviewUrl('')}
                  className="btn-secondary"
                >
                  ❌ Close Preview
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Code Paste Modal */}
        {showCodePaste && (
          <div className="code-paste-overlay">
            <div className="code-paste-modal">
              <div className="code-paste-header">
                <h3>📝 Paste Code</h3>
                <button 
                  onClick={() => setShowCodePaste(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>

              <div className="code-paste-content">
                <div className="paste-form">
                  <div className="form-group">
                    <label>File Name:</label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Enter filename (e.g., script.js)"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Language:</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="form-select"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="css">CSS</option>
                      <option value="html">HTML</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Code:</label>
                    <div className="code-editor-container">
                      {showSyntaxHighlighting ? (
                        <SyntaxHighlighter
                          language={selectedLanguage}
                          style={tomorrow}
                          className="code-highlighter"
                          showLineNumbers={true}
                          wrapLines={true}
                        >
                          {pastedCode || '// Paste your code here...'}
                        </SyntaxHighlighter>
                      ) : (
                        <textarea
                          value={pastedCode}
                          onChange={(e) => setPastedCode(e.target.value)}
                          placeholder="Paste your code here..."
                          className="code-textarea"
                          rows={15}
                        />
                      )}
                    </div>
                    <div className="editor-controls">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={showSyntaxHighlighting}
                          onChange={(e) => setShowSyntaxHighlighting(e.target.checked)}
                        />
                        Syntax Highlighting
                      </label>
                    </div>
                  </div>

                  <div className="paste-actions">
                    <button 
                      onClick={savePastedCode}
                      className="btn-primary"
                      disabled={loading || !pastedCode.trim() || !fileName.trim()}
                    >
                      {loading ? '⏳ Saving...' : '💾 Save Code'}
                    </button>
                    <button 
                      onClick={() => setShowCodePaste(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborativeEditor;
