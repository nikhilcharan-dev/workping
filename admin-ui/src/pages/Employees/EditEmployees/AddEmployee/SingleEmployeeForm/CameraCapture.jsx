import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import { FaceDetection } from '@mediapipe/face_detection'
import { Camera } from '@mediapipe/camera_utils'

const CameraCapture = ({ onCapture }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const cameraRef = useRef(null)
  const initializedRef = useRef(false)

  const [isCaptured, setIsCaptured] = useState(false)
  const [faceFound, setFaceFound] = useState(false)

  const drawCorners = (ctx, x, y, w, h) => {
    const len = Math.min(w, h) * 0.2
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3

    // TL
    ctx.beginPath()
    ctx.moveTo(x, y + len)
    ctx.lineTo(x, y)
    ctx.lineTo(x + len, y)
    ctx.stroke()

    // TR
    ctx.beginPath()
    ctx.moveTo(x + w - len, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + len)
    ctx.stroke()

    // BL
    ctx.beginPath()
    ctx.moveTo(x, y + h - len)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x + len, y + h)
    ctx.stroke()

    // BR
    ctx.beginPath()
    ctx.moveTo(x + w - len, y + h)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + w, y + h - len)
    ctx.stroke()
  }

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const faceDetection = new FaceDetection({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    })

    faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.6,
    })

    faceDetection.onResults((results) => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const video = videoRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (results.detections && results.detections.length > 0) {
        setFaceFound(true)

        const box = results.detections[0].boundingBox
        const x = box.xCenter * canvas.width - (box.width * canvas.width) / 2
        const y = box.yCenter * canvas.height - (box.height * canvas.height) / 2
        const w = box.width * canvas.width
        const h = box.height * canvas.height

        drawCorners(ctx, x, y, w, h)
      } else {
        setFaceFound(false)
      }
    })

    cameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceDetection.send({ image: videoRef.current })
      },
      width: 640,
      height: 480,
    })

    cameraRef.current.start()

    return () => {
      cameraRef.current?.stop()
    }
  }, [])

  const capture = async () => {
    if (!faceFound) return alert('No face detected')

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    setIsCaptured(true)
    cameraRef.current?.stop()

    const pixels = new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data)

    const hashBuffer = await crypto.subtle.digest('SHA-256', pixels)
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    onCapture?.({ source: 'camera', hash })
  }

  const retake = () => {
    setIsCaptured(false)
    setFaceFound(false)
    cameraRef.current?.start()
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 420, // 👈 change this to control camera size on laptop
        margin: '0 auto',
      }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3', // keeps camera proportional
          background: '#000',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isCaptured ? 'none' : 'block',
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: isCaptured ? 'none' : 'block',
          }}
        />
      </div>

      {!isCaptured && (
        <Button className="mt-3" onClick={capture} disabled={!faceFound}>
          {faceFound ? 'Capture Face' : 'Align Face'}
        </Button>
      )}

      {isCaptured && (
        <Button variant="secondary" className="mt-3" onClick={retake}>
          Retake
        </Button>
      )}
    </div>
  )
}

export default CameraCapture
