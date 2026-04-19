import { useState, useRef, useEffect } from 'react';

function AudioRecorder({ onRecordingComplete, onTranscribe, isTranscribing, hasAudio }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Start drawing only after canvas is mounted (isRecording → true triggers re-render)
  useEffect(() => {
    if (isRecording) drawWaveform();
  }, [isRecording]);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const amplitudeHistory = [];
    const BAR_WIDTH = 3;
    const BAR_GAP = 2;
    const maxBars = Math.floor(canvas.width / (BAR_WIDTH + BAR_GAP));

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Compute RMS amplitude (0–1)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const norm = (dataArray[i] - 128) / 128;
        sum += norm * norm;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      amplitudeHistory.push(rms);
      if (amplitudeHistory.length > maxBars) amplitudeHistory.shift();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const midY = canvas.height / 2;

      amplitudeHistory.forEach((amp, i) => {
        const barHeight = Math.max(2, amp * canvas.height * 2.5);
        const x = i * (BAR_WIDTH + BAR_GAP);
        const alpha = 0.4 + (i / amplitudeHistory.length) * 0.6;
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, midY - barHeight / 2, BAR_WIDTH, barHeight, 2);
        ctx.fill();
      });
    };

    draw();
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });

      // Set up Web Audio API analyser for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        cancelAnimationFrame(animationRef.current);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(url);
        onRecordingComplete(blob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      alert(error.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone access.'
        : `Recording failed: ${error.message}`
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <section className="recording-section">
      <div className="controls">
        <button
          className="btn btn-primary"
          onClick={startRecording}
          disabled={isRecording || isTranscribing}
        >
          <span className="btn-icon">&#9679;</span>
          Record
        </button>
        <button
          className="btn btn-secondary"
          onClick={stopRecording}
          disabled={!isRecording}
        >
          <span className="btn-icon">&#9632;</span>
          Stop
        </button>
      </div>

      {isRecording && (
        <div className="waveform-container">
          <div className="recording-indicator">
            <span className="pulse"></span>
            <span>Recording...</span>
            <span>{formatTime(recordingTime)}</span>
          </div>
          <canvas ref={canvasRef} className="waveform-canvas" width={700} height={80} />
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="audio-preview">
          <audio controls src={audioUrl} />
          <button
            className="btn btn-accent"
            onClick={onTranscribe}
            disabled={isTranscribing || !hasAudio}
          >
            {isTranscribing ? 'Transcribing...' : 'Transcribe'}
          </button>
        </div>
      )}
    </section>
  );
}

export default AudioRecorder;
