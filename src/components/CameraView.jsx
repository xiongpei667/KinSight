import { Camera, Bell } from 'lucide-react';

export default function CameraView({ videoRef, canvasRef, cameraReady, status, error, onStartCamera, modelsReady, t }) {
  return (
    <div className="card monitor-card">
      <div className="section-title">
        <Camera size={18} />
        <span>{t('appTitle')}</span>
      </div>
      <div className="video-wrap">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} className="detection-overlay" />
        {!cameraReady && (
          <div className="video-placeholder">
            {modelsReady ? t('waitCamera') : t('loadingModelFirst')}
          </div>
        )}
      </div>
      <div className="status-line">
        <Bell size={16} />
        <span>{status}</span>
      </div>
      {!cameraReady && (
        <button
          className="primary full"
          onClick={onStartCamera}
          disabled={!modelsReady}
          style={{ marginTop: 10 }}
        >
          <Camera size={18} />
          {modelsReady ? t('startCamera') : t('modelLoading')}
        </button>
      )}
      {error && <div className="alert"><span>{error}</span></div>}
    </div>
  );
}
