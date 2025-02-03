import React, { useState, useEffect, useRef } from 'react';
import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from '@snap/camera-kit';
import EmblaCarousel from './EmblaCarousel';
import Snaplogo from '../../Assets/Camera/Powered_bysnap.png';
import './Camera.css';

const LensCarousel = ({ lenses, onLensChange }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSelect = (index) => {
    setActiveIndex(index);
    onLensChange(lenses[index]);
  };

  return (
    <EmblaCarousel
      slides={lenses.map((_, index) => index)}
      options={{ loop: false }}
      onSelect={handleSelect}
    />
  );
};

const Camera = () => {
  const [currentLenses, setCurrentLenses] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isBackFacing, setIsBackFacing] = useState(true);

  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    const initCamera = async () => {
      const cameraKit = await bootstrapCameraKit({
        apiToken: process.env.REACT_APP_API,
      });

      const session = await cameraKit.createSession({
        liveRenderTarget: canvasRef.current,
      });
      sessionRef.current = session;

      await loadCameraStream(session, isBackFacing);

      const { lenses } = await cameraKit.lensRepository.loadLensGroups([
        process.env.REACT_APP_GRPID,
      ]);
      setCurrentLenses(lenses);
    };

    initCamera();
  }, []);

  const loadCameraStream = async (session, backFacing) => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks()[0].stop();
      session.pause();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: backFacing ? 'environment' : 'user' },
    });

    const source = createMediaStreamSource(stream, {
      cameraType: backFacing ? 'back' : 'front',
    });

    mediaStreamRef.current = stream;
    await session.setSource(source);

    if (!backFacing) {
      source.setTransform(Transform2D.MirrorX);
    }

    session.play();
  };

  const flipCamera = () => {
    setIsBackFacing((prev) => !prev);
    loadCameraStream(sessionRef.current, !isBackFacing);
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
      <section className="canvas-section">
        <canvas ref={canvasRef}></canvas>
        <div className="carousel-wrapper">
          {currentLenses.length > 0 && (
            <LensCarousel lenses={currentLenses} onLensChange={handleLensChange} />
          )}
        </div>
        <img src={Snaplogo} alt="Powered by Snap" className="snap-logo" />
      </section>

      <section className="controls-section">
        <button className="control-btn" onClick={startRecording} disabled={isRecording}>
          Start Recording
        </button>
        <button className="control-btn" onClick={stopRecording} disabled={!isRecording}>
          Stop Recording
        </button>
        <button className="control-btn" onClick={flipCamera}>
          {isBackFacing ? 'Switch to Front Camera' : 'Switch to Back Camera'}
        </button>
      </section>

      {showVideo && (
        <section className="video-section">
          <video ref={videoRef} src={videoUrl} loop controls autoPlay />
          <div>
            <button className="control-btn" onClick={downloadVideo}>
              Download Video
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Camera;
