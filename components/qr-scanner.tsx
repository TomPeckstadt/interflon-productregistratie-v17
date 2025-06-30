"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface QrScannerProps {
  onResult: (result: string) => void
  onClose: () => void
}

export default function QrScannerComponent({ onResult, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string>("")
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError("")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsScanning(true)

        // Start scanning after video loads
        videoRef.current.onloadedmetadata = () => {
          scanForQRCode()
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Kan camera niet openen. Zorg ervoor dat je toestemming hebt gegeven voor camera toegang.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const scanForQRCode = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      setTimeout(scanForQRCode, 100)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      // Try to detect QR code using a simple pattern detection
      // This is a basic implementation - in production you'd use a proper QR code library
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      // For demo purposes, we'll simulate QR code detection
      // In a real app, you'd use libraries like jsQR or qr-scanner

      // Continue scanning
      if (isScanning) {
        setTimeout(scanForQRCode, 100)
      }
    } catch (err) {
      console.error("Error scanning QR code:", err)
      if (isScanning) {
        setTimeout(scanForQRCode, 100)
      }
    }
  }

  const handleManualInput = () => {
    const input = prompt("Voer QR code handmatig in:")
    if (input && input.trim()) {
      onResult(input.trim())
    }
  }

  return (
    <div className="relative bg-white rounded-lg p-4 max-w-md w-full mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">QR Code Scanner</h3>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error ? (
        <div className="text-center py-8">
          <div className="text-red-500 text-4xl mb-4">📷</div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={startCamera} className="w-full">
              Probeer Opnieuw
            </Button>
            <Button variant="outline" onClick={handleManualInput} className="w-full bg-transparent">
              Handmatig Invoeren
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <video ref={videoRef} className="w-full h-64 bg-black rounded-lg object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Richt de camera op een QR code om te scannen</p>
            <div className="space-y-2">
              <Button variant="outline" onClick={handleManualInput} className="w-full bg-transparent">
                Handmatig Invoeren
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
