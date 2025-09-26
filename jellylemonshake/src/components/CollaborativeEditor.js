import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
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
        setPreviewUrl(data.compilation.previewUrl);
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
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollaborativeEditor;
