import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const chunkSize = 10 * 1024;

function App() {
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(null);
  const [lastUploadedFileIndex, setLastUploadedFileIndex] = useState(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(null);

  function handleDrop(e) {
    e.preventDefault();
    setFiles([...files, ...e.dataTransfer.files]);
  }

  function readAndUploadCurrentChunk() {
    const reader = new FileReader();
    const file = files[currentFileIndex];
    if (!file) {
      return;
    }
    const from = currentChunkIndex * chunkSize;
    const to = from + chunkSize;
    const blob = file.slice(from, to);
    reader.onload = (e) => uploadChunk(e);
    reader.readAsDataURL(blob);
  }

  function uploadChunk(readerEvent) {
    const file = files[currentFileIndex];
    const data = readerEvent.target.result;
    const params = new URLSearchParams();
    params.set('idUpload', localStorage.lastFileId);
    params.set('name', file.name);
    params.set('size', file.size);
    params.set('currentChunkIndex', currentChunkIndex);
    params.set('totalChunks', Math.ceil(file.size / chunkSize));
    const headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: 'Bearer 1nJq4bDUgkHOgOpVB6kzIWKq7lQBqKC2F8BhoJiYHOMCF5iHIvRrj8kq3W7d',
    };
    const url = 'http://localhost:8001/api/v2/upload/public?' + params.toString();

    const maxRetryCount = 3; // Maximum number of retry attempts
    let retryCount = 0;

    function performAxiosRequest() {
      axios
        .post(url, data, { headers, timeout: 5000 })
        .then((response) => {
          const file = files[currentFileIndex];
          const filesize = files[currentFileIndex].size;
          const chunks = Math.ceil(filesize / chunkSize) - 1;
          const isLastChunk = currentChunkIndex === chunks;
          if (isLastChunk) {
            file.finalFilename = response.data.finalFilename;
            setLastUploadedFileIndex(currentFileIndex);
            setCurrentChunkIndex(null);
            console.log(response);
          } else {
            setCurrentChunkIndex(currentChunkIndex + 1);
          }
        })
        .catch((error) => {
          if (retryCount < maxRetryCount) {
            console.log(`Axios POST request failed, retrying (Attempt ${retryCount + 1})`);
            retryCount++;
            // performAxiosRequest(); // Retry the request
          } else {
            // Handle when hitting the max retry limit
            setCurrentChunkIndex(0);
            console.error('Max retry attempts reached, unable to complete the request.');
          }
        });
    }

    // Initial request
    performAxiosRequest();
  }

  useEffect(() => {
    if (lastUploadedFileIndex === null) {
      return;
    }
    const isLastFile = lastUploadedFileIndex === files.length - 1;
    const nextFileIndex = isLastFile ? null : currentFileIndex + 1;
    setCurrentFileIndex(nextFileIndex);
  }, [lastUploadedFileIndex]);

  useEffect(() => {
    if (files.length > 0) {
      if (currentFileIndex === null) {
        setCurrentFileIndex(lastUploadedFileIndex === null ? 0 : lastUploadedFileIndex + 1);
      }
    }
  }, [files.length]);

  useEffect(() => {
    if (currentFileIndex !== null) {
      setCurrentChunkIndex(0);
    }
  }, [currentFileIndex]);

  useEffect(() => {
    if (currentChunkIndex !== null) {
      readAndUploadCurrentChunk();
    }
  }, [currentChunkIndex]);

  return (
    <div>
      <div
        onDragOver={(e) => {
          setDropzoneActive(true);
          e.preventDefault();
        }}
        onDragLeave={(e) => {
          setDropzoneActive(false);
          e.preventDefault();
        }}
        onDrop={(e) => handleDrop(e)}
        className={'dropzone' + (dropzoneActive ? ' active' : '')}
      >
        Drop your files here
      </div>
      <div className="files">
        {files.map((file, fileIndex) => {
          let progress = 0;
          if (file.finalFilename) {
            progress = 100;
          } else {
            const uploading = fileIndex === currentFileIndex;
            const chunks = Math.ceil(file.size / chunkSize);
            if (uploading) {
              progress = Math.round((currentChunkIndex / chunks) * 100);
            } else {
              progress = 0;
            }
          }
          return (
            <>
              <a className="file" key={fileIndex} target="_blank" href={'http://localhost:8001/api/v2/upload/public?' + file.finalFilename}>
                <div className="name">{file.name}</div>
                <div className={'progress ' + (progress === 100 ? 'done' : '')} style={{ width: progress + '%' }}>
                  {progress}%
                </div>
              </a>
              <button className="buttonUpload" style={{ marginTop: 20 }}>
                Upload
              </button>
            </>
          );
        })}
      </div>
    </div>
  );
}

export default App;
