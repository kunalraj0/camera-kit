import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from '@snap/camera-kit';
import Snaplogo from '../../Assets/Camera/Powered_bysnap.png';
import './Camera.css';

const LensCarousel = ({ lenses, onLensChange }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextLens = () => {
    const newIndex = (activeIndex + 1) % lenses.length;
    setActiveIndex(newIndex);
    onLensChange(lenses[newIndex]);
  };

  const prevLens = () => {
    const newIndex = activeIndex === 0 ? lenses.length - 1 : activeIndex - 1;
    setActiveIndex(newIndex);
    onLensChange(lenses[newIndex]);
  };

  return (
    <div className="lens-carousel">
      <button className="carousel-btn" onClick={prevLens}>
        <ChevronLeft size={24} />
      </button>
      
      <div className="lens-display">
        <div className="lens-number">Lens {activeIndex + 1}</div>
      </div>

      <button className="carousel-btn" onClick={nextLens}>
        <ChevronRight size={24} />
      </button>
    </div>
  );
};

const Camera = () => {
  const [availableSources, setAvailableSources] = useState([]);
  const [currentLenses, setCurrentLenses] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const initCamera = async () => {
      const cameraKit = await bootstrapCameraKit({
        apiToken: process.env.REACT_APP_API,
      });

      const session = await cameraKit.createSession({ 
        liveRenderTarget: canvasRef.current 
      });
      sessionRef.current = session;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      const source = createMediaStreamSource(mediaStream);
      await session.setSource(source);
      await session.play();

      const { lenses } = await cameraKit.lensRepository.loadLensGroups([
        process.env.REACT_APP_GRPID,
      ]);
      setCurrentLenses(lenses);

      // Get available camera sources
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableSources(videoDevices);
    };

    initCamera();
  }, []);

  const handleSourceChange = async (event) => {
    const deviceId = event.target.value;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });
    const source = createMediaStreamSource(stream);
    
    if (sessionRef.current) {
      await sessionRef.current.setSource(source);
      source.setTransform(Transform2D.MirrorX);
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (document.body.offsetWidth <= 768) {
        source.setRenderSize(width, height);
      }
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setShowVideo(false);
    const mediaStream = canvasRef.current.captureStream(30);
    mediaRecorderRef.current = new MediaRecorder(mediaStream);

    mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
      if (event.data.size) {
        const url = window.URL.createObjectURL(new Blob([event.data]));
        setVideoUrl(url);
        setShowVideo(true);
      }
    });

    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  const downloadVideo = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = 'camera-kit-web-recording.mp4';
    link.click();
  };

  const handleLensChange = async (lens) => {
    if (sessionRef.current) {
      await sessionRef.current.applyLens(lens);
    }
  };

  return (
    <div className="camera-container">
      <section className="canvas-section" style={{ position: 'relative' }}>
        <canvas ref={canvasRef}></canvas>
        <img 
          src={Snaplogo}
          alt="Powered by Snap" 
          className="snap-logo"
        />
        {currentLenses.length > 0 && (
          <LensCarousel 
            lenses={currentLenses}
            onLensChange={handleLensChange}
          />
        )}
      </section>

      <section className="controls-section">
        <button 
          className="control-btn" 
          onClick={startRecording} 
          disabled={isRecording}
        >
          Start Recording
        </button>
        <button 
          className="control-btn" 
          onClick={stopRecording} 
          disabled={!isRecording}
        >
          Stop Recording
        </button>
      </section>

      {showVideo && (
        <section className="video-section">
          <video 
            ref={videoRef}
            src={videoUrl}
            loop 
            controls 
            autoPlay
          />
          <div>
            <button 
              className="control-btn"
              onClick={downloadVideo}
            >
              Download Video
            </button>
          </div>
        </section>
      )}

      <section className="source-section">
        <label htmlFor="source-select">Select Camera Source: </label>
        <select 
          id="source-select" 
          className="source-select"
          onChange={handleSourceChange}
        >
          {availableSources.map((source, index) => (
            <option key={source.deviceId} value={source.deviceId}>
              {source.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
};

export default Camera;